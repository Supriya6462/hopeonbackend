import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { WithdrawalStatus, Role, DonationStatus } from "../types/enums.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { Donation } from "../models/Donation.model.js";
import OrganizerProfile from "../models/OrganizerProfile.model.js";
import { User } from "../models/User.model.js";
import ActivityLog from "../models/ActivityLog.js";
import { mailService } from "../mail/mail.service.js";
import {
  createInAppNotification,
  NotificationEventType,
  notifyCampaignDonorsInApp,
} from "../services/notification.service.js";
import { recordPayoutBlock } from "../services/blockchain.service.js";

interface CreateWithdrawalDTO {
  campaign: string;
  amount?: number;
  amountRequested: number;
  payoutMethod: string;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    accountType?: "savings" | "checking" | "business";
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    bankAddress?: string;
    bankCountry?: string;
  };
  documents?: {
    governmentId?: { url?: string; type?: string; verified?: boolean };
    bankProof?: { url?: string; type?: string; verified?: boolean };
    addressProof?: { url?: string; type?: string; verified?: boolean };
    taxDocument?: { url?: string; type?: string; verified?: boolean };
  };
  kycInfo?: {
    fullLegalName?: string;
    dateOfBirth?: Date | string;
    nationality?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    phoneNumber?: string;
    taxId?: string;
  };
  reason?: string;
}

interface WithdrawalFilters {
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
}

type WithdrawalDocumentType =
  | "governmentId"
  | "bankProof"
  | "addressProof"
  | "taxDocument";

interface UploadedDocumentFile extends Express.Multer.File {
  location?: string;
  key?: string;
}

export class WithdrawalService {
  private isCampaignApproved(campaign: { status?: string }) {
    return campaign.status === "active" || campaign.status === "expired";
  }

  private maskTransactionReference(reference?: string | null) {
    if (!reference || typeof reference !== "string") {
      return null;
    }

    const trimmed = reference.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.length <= 4) {
      return "****";
    }

    return `${"*".repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`;
  }

  private async createAuditLog({
    user,
    activityType,
    description,
    metadata,
    relatedEntity,
  }: {
    user: string | mongoose.Types.ObjectId;
    activityType: string;
    description: string;
    metadata?: Record<string, unknown>;
    relatedEntity?: { entityType: string; entityId: mongoose.Types.ObjectId };
  }) {
    try {
      await ActivityLog.create({
        user,
        activityType,
        description,
        metadata: metadata || {},
        relatedEntity: relatedEntity || undefined,
      });
    } catch (error) {
      console.error("Failed to create activity log:", error);
    }
  }

  private async notifyDonorsByEmail({
    campaignId,
    campaignTitle,
    status,
    amount,
    eventDate,
    transferReferenceMasked,
  }: {
    campaignId: mongoose.Types.ObjectId;
    campaignTitle: string;
    status: "scheduled" | "completed";
    amount: number;
    eventDate: Date;
    transferReferenceMasked?: string | null;
  }) {
    const donorIds = await Donation.distinct("donor", {
      campaign: campaignId,
      status: DonationStatus.COMPLETED,
    });

    if (!donorIds.length) {
      return 0;
    }

    const donors = await User.find({ _id: { $in: donorIds } }).select(
      "name email",
    );

    const emailResults = await Promise.all(
      donors.map(async (donor) => {
        if (!donor.email) {
          return false;
        }

        try {
          await mailService.sendDonorCampaignPayoutUpdateEmail({
            to: donor.email,
            name: donor.name || "Supporter",
            campaignTitle,
            status,
            amount,
            eventDate,
            transferReferenceMasked: transferReferenceMasked || undefined,
          });
          return true;
        } catch (error) {
          console.error(
            `Failed to send donor payout update email to ${donor.email}:`,
            error,
          );
          return false;
        }
      }),
    );

    return emailResults.filter(Boolean).length;
  }

  // Get total donations (net amount) for a campaign
  private async getCampaignTotalDonations(campaignId: string): Promise<number> {
    const result = await Donation.aggregate([
      {
        $match: {
          campaign: new mongoose.Types.ObjectId(campaignId),
          status: DonationStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  // Get total amount already withdrawn (PAID status only)
  private async getCampaignTotalWithdrawn(campaignId: string): Promise<number> {
    const result = await WithdrawalRequest.aggregate([
      {
        $match: {
          campaign: new mongoose.Types.ObjectId(campaignId),
          status: WithdrawalStatus.PAID,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  // Get total pending/reserved amount (REQUESTED or APPROVED but not yet PAID)
  private async getCampaignPendingWithdrawals(
    campaignId: string,
  ): Promise<number> {
    const result = await WithdrawalRequest.aggregate([
      {
        $match: {
          campaign: new mongoose.Types.ObjectId(campaignId),
          status: {
            $in: [WithdrawalStatus.REQUESTED, WithdrawalStatus.APPROVED],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  // Get available balance (donations minus paid withdrawals minus pending withdrawals)
  private async getCampaignAvailableBalance(
    campaignId: string,
  ): Promise<number> {
    const [totalDonations, totalWithdrawn, pendingWithdrawals] =
      await Promise.all([
        this.getCampaignTotalDonations(campaignId),
        this.getCampaignTotalWithdrawn(campaignId),
        this.getCampaignPendingWithdrawals(campaignId),
      ]);

    return Math.max(0, totalDonations - totalWithdrawn - pendingWithdrawals);
  }

  // Create withdrawal request (organizer only)
  async createWithdrawalRequest(
    organizerId: string,
    withdrawalData: CreateWithdrawalDTO,
  ) {
    // Validate required fields
    if (
      !withdrawalData.campaign ||
      !(withdrawalData.amountRequested ?? withdrawalData.amount) ||
      !withdrawalData.payoutMethod
    ) {
      throw new ApiError(
        "Campaign, amount requested, and payout method are required",
        400,
        "WITHDRAWAL_VALIDATION_ERROR",
      );
    }

    // Validate amount
    const amountRequested = Number(
      withdrawalData.amountRequested ?? withdrawalData.amount,
    );
    if (isNaN(amountRequested) || amountRequested <= 0) {
      throw new ApiError(
        "Amount requested must be a positive number",
        400,
        "WITHDRAWAL_INVALID_AMOUNT",
      );
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new ApiError("Invalid organizer ID", 400, "INVALID_ORGANIZER_ID");
    }
    if (!mongoose.Types.ObjectId.isValid(withdrawalData.campaign)) {
      throw new ApiError("Invalid campaign ID", 400, "INVALID_CAMPAIGN_ID");
    }

    const organizerProfile = await OrganizerProfile.findOne({
      organizer: organizerId,
    });

    if (!organizerProfile) {
      throw new ApiError(
        "Organizer profile not found. Complete your KYC and bank profile first.",
        400,
        "ORGANIZER_PROFILE_REQUIRED",
      );
    }

    if (organizerProfile.verificationStatus !== "verified") {
      throw new ApiError(
        "Organizer profile is not verified yet.",
        400,
        "ORGANIZER_PROFILE_NOT_VERIFIED",
        {
          verificationStatus: organizerProfile.verificationStatus,
          rejectionReason: organizerProfile.rejectionReason,
        },
      );
    }

    // Verify campaign ownership
    const campaignDoc = await Campaign.findById(withdrawalData.campaign);
    if (!campaignDoc) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    if (campaignDoc.owner.toString() !== organizerId) {
      throw new ApiError(
        "You don't own this campaign",
        403,
        "CAMPAIGN_ACCESS_DENIED",
      );
    }

    if (!this.isCampaignApproved(campaignDoc)) {
      throw new ApiError(
        "Campaign must be approved before requesting withdrawal",
        400,
        "CAMPAIGN_NOT_APPROVED",
      );
    }

    // Check if amount is available
    // if (amountRequested > campaignDoc.raised) {
    //   throw new Error(
    //     `Requested amount (${amountRequested}) exceeds available funds (${campaignDoc.raised})`
    //   );
    // }
    const [totalRaised, totalWithdrawn, availableBalance] = await Promise.all([
      this.getCampaignTotalDonations(withdrawalData.campaign),
      this.getCampaignTotalWithdrawn(withdrawalData.campaign),
      this.getCampaignAvailableBalance(withdrawalData.campaign),
    ]);

    if (amountRequested > availableBalance) {
      throw new ApiError(
        `Requested amount exceeds available balance (${availableBalance})`,
        400,
        "WITHDRAWAL_INSUFFICIENT_FUNDS",
      );
    }

    // Check for pending or approved withdrawal requests
    const existingRequest = await WithdrawalRequest.findOne({
      campaign: withdrawalData.campaign,
      status: { $in: [WithdrawalStatus.REQUESTED, WithdrawalStatus.APPROVED] },
    });

    if (existingRequest) {
      throw new ApiError(
        "You already have a pending or approved withdrawal request for this campaign",
        400,
        "WITHDRAWAL_REQUEST_EXISTS",
      );
    }

    const withdrawal = new WithdrawalRequest({
      organizer: organizerId,
      organizerProfile: organizerProfile._id,
      campaign: withdrawalData.campaign,
      amount: amountRequested,
      availableBalanceSnapshot: availableBalance,
      totalRaisedSnapshot: totalRaised,
      totalWithdrawnSnapshot: totalWithdrawn,
      bankDetails: (organizerProfile as any).getDecryptedBankDetails(),
      documents: organizerProfile.documents,
      kycInfo: organizerProfile.kycInfo,
      reviewNotes: withdrawalData.reason,
      status: WithdrawalStatus.REQUESTED,
    });

    await withdrawal.save();

    await this.createAuditLog({
      user: organizerId,
      activityType: "withdrawal_requested",
      description: `Withdrawal request submitted for campaign ${campaignDoc.title}`,
      metadata: {
        campaignId: campaignDoc._id,
        withdrawalRequestId: withdrawal._id,
        amount: withdrawal.amount,
      },
      relatedEntity: {
        entityType: "WithdrawalRequest",
        entityId: withdrawal._id,
      },
    });

    try {
      await createInAppNotification({
        recipient: organizerId,
        eventType: NotificationEventType.WITHDRAWAL_REQUESTED,
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal request for ${campaignDoc.title} is pending review.`,
        payload: {
          withdrawalRequestId: withdrawal._id,
          campaignId: campaignDoc._id,
          amount: withdrawal.amount,
          status: withdrawal.status,
        },
      });

      const admins = await User.find({ role: Role.ADMIN }).select("_id");
      if (admins.length) {
        await Promise.all(
          admins.map((admin) =>
            createInAppNotification({
              recipient: admin._id,
              eventType:
                NotificationEventType.WITHDRAWAL_REQUEST_PENDING_REVIEW,
              title: "New Withdrawal Request",
              message: `A withdrawal request needs review for ${campaignDoc.title}.`,
              payload: {
                withdrawalRequestId: withdrawal._id,
                campaignId: campaignDoc._id,
                amount: withdrawal.amount,
                status: withdrawal.status,
              },
            }),
          ),
        );
      }
    } catch (notificationError) {
      console.error(
        "Failed to create withdrawal in-app notifications:",
        notificationError,
      );
    }

    try {
      const organizer = await User.findById(organizerId).select("name email");
      if (organizer?.email) {
        await mailService.sendWithdrawalRequestEmail({
          to: organizer.email,
          name: organizer.name || "Organizer",
          campaignTitle: campaignDoc.title,
          withdrawalRequestId: withdrawal._id.toString(),
          amount: withdrawal.amount,
          submittedAt: withdrawal.createdAt,
        });
      }
    } catch (emailError) {
      console.error("Failed to send withdrawal request email:", emailError);
    }

    return withdrawal;
  }

  // Get withdrawal requests by organizer
  async getOrganizerWithdrawals(organizerId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new ApiError("Invalid organizer ID", 400, "INVALID_ORGANIZER_ID");
    }

    return WithdrawalRequest.find({ organizer: organizerId })
      .populate("campaign", "title raised target imageURL")
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get all withdrawal requests (admin only)
  async getAllWithdrawals(filters: WithdrawalFilters = {}) {
    const query: any = {};

    // Filter by status
    if (
      filters.status &&
      Object.values(WithdrawalStatus).includes(filters.status)
    ) {
      query.status = filters.status;
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      WithdrawalRequest.find(query)
        .populate("organizer", "name email phoneNumber")
        .populate("campaign", "title raised target imageURL")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WithdrawalRequest.countDocuments(query),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get single withdrawal request
  async getWithdrawalById(
    withdrawalId: string,
    userId: string,
    userRole: string,
  ) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new ApiError("Invalid withdrawal ID", 400, "INVALID_WITHDRAWAL_ID");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId)
      .populate("organizer", "name email phoneNumber")
      .populate("campaign", "title raised target owner imageURL")
      .populate("reviewedBy", "name email")
      .lean();

    if (!withdrawal) {
      throw new ApiError(
        "Withdrawal request not found",
        404,
        "WITHDRAWAL_NOT_FOUND",
      );
    }

    // Check access permissions
    if (
      userRole !== Role.ADMIN &&
      withdrawal.organizer._id.toString() !== userId
    ) {
      throw new ApiError("Access denied", 403, "WITHDRAWAL_ACCESS_DENIED");
    }

    return withdrawal;
  }

  // Approve withdrawal (admin only)
  async approveWithdrawal(withdrawalId: string, adminId: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new ApiError("Invalid withdrawal ID", 400, "INVALID_WITHDRAWAL_ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId);

    if (!withdrawal) {
      throw new ApiError(
        "Withdrawal request not found",
        404,
        "WITHDRAWAL_NOT_FOUND",
      );
    }

    if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
      throw new ApiError(
        "Only pending requests can be approved",
        400,
        "INVALID_WITHDRAWAL_STATUS",
      );
    }

    withdrawal.status = WithdrawalStatus.APPROVED;
    withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    try {
      const populated = await WithdrawalRequest.findById(withdrawal._id)
        .populate("organizer", "name email")
        .populate("campaign", "title");

      if (!populated || !populated.campaign || !populated.organizer) {
        return withdrawal;
      }

      const campaignTitle =
        (populated.campaign as any).title || "this campaign";

      await createInAppNotification({
        recipient: withdrawal.organizer,
        eventType: NotificationEventType.WITHDRAWAL_APPROVED,
        title: "Withdrawal Approved",
        message: "Your withdrawal request has been approved and scheduled.",
        payload: {
          withdrawalRequestId: withdrawal._id,
          campaignId: withdrawal.campaign,
          amount: withdrawal.amount,
          status: withdrawal.status,
        },
      });

      const campaign = await Campaign.findById(withdrawal.campaign).select(
        "title",
      );
      const donorInAppResult = await notifyCampaignDonorsInApp({
        campaignId: withdrawal.campaign.toString(),
        withdrawalRequestId: withdrawal._id.toString(),
        campaignTitle: campaign?.title || campaignTitle,
        status: "scheduled",
        amount: withdrawal.amount,
        eventDate: new Date(),
      });

      const donorEmailCount = await this.notifyDonorsByEmail({
        campaignId: withdrawal.campaign,
        campaignTitle,
        status: "scheduled",
        amount: withdrawal.amount,
        eventDate: withdrawal.reviewedAt || new Date(),
      });

      const organizerEmail = (populated.organizer as any).email;
      const organizerName = (populated.organizer as any).name || "Organizer";
      if (organizerEmail) {
        await mailService.sendWithdrawalStatusEmail({
          to: organizerEmail,
          name: organizerName,
          campaignTitle,
          status: "approved",
          amount: withdrawal.amount,
        });
      }

      await this.createAuditLog({
        user: adminId,
        activityType: "withdrawal_approved",
        description: `Withdrawal approved for campaign ${campaignTitle}`,
        metadata: {
          withdrawalRequestId: withdrawal._id,
          campaignId: withdrawal.campaign,
          donorEmailCount,
          donorInAppCount: donorInAppResult.notifiedCount,
        },
        relatedEntity: {
          entityType: "WithdrawalRequest",
          entityId: withdrawal._id,
        },
      });
    } catch (notifyError) {
      console.error(
        "Failed to notify withdrawal approval events:",
        notifyError,
      );
    }

    return withdrawal;
  }

  // Reject withdrawal (admin only)
  async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminMessage?: string,
  ) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new ApiError("Invalid withdrawal ID", 400, "INVALID_WITHDRAWAL_ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId);

    if (!withdrawal) {
      throw new ApiError(
        "Withdrawal request not found",
        404,
        "WITHDRAWAL_NOT_FOUND",
      );
    }

    if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
      throw new ApiError(
        "Only pending requests can be rejected",
        400,
        "INVALID_WITHDRAWAL_STATUS",
      );
    }

    withdrawal.status = WithdrawalStatus.REJECTED;
    withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);
    withdrawal.reviewedAt = new Date();
    withdrawal.rejectionReason =
      adminMessage?.trim() || "Withdrawal request rejected";
    await withdrawal.save();

    try {
      await createInAppNotification({
        recipient: withdrawal.organizer,
        eventType: NotificationEventType.WITHDRAWAL_REJECTED,
        title: "Withdrawal Rejected",
        message:
          withdrawal.rejectionReason ||
          "Your withdrawal request was rejected. Please review and retry.",
        payload: {
          withdrawalRequestId: withdrawal._id,
          campaignId: withdrawal.campaign,
          amount: withdrawal.amount,
          status: withdrawal.status,
          rejectionReason: withdrawal.rejectionReason,
        },
      });

      const populated = await WithdrawalRequest.findById(withdrawal._id)
        .populate("organizer", "name email")
        .populate("campaign", "title");

      if (populated?.organizer && populated?.campaign) {
        const organizerEmail = (populated.organizer as any).email;
        if (organizerEmail) {
          await mailService.sendWithdrawalStatusEmail({
            to: organizerEmail,
            name: (populated.organizer as any).name || "Organizer",
            campaignTitle: (populated.campaign as any).title || "Campaign",
            status: "rejected",
            amount: withdrawal.amount,
            rejectionReason: withdrawal.rejectionReason || undefined,
          });
        }
      }

      await this.createAuditLog({
        user: adminId,
        activityType: "withdrawal_rejected",
        description: `Withdrawal rejected for request ${withdrawal._id.toString()}`,
        metadata: {
          withdrawalRequestId: withdrawal._id,
          campaignId: withdrawal.campaign,
          rejectionReason: withdrawal.rejectionReason,
        },
        relatedEntity: {
          entityType: "WithdrawalRequest",
          entityId: withdrawal._id,
        },
      });
    } catch (notifyError) {
      console.error(
        "Failed to notify withdrawal rejection event:",
        notifyError,
      );
    }

    return withdrawal;
  }

  // Mark as paid (admin only)
  //   async markAsPaid(withdrawalId: string, adminId: string, paymentReference?: string) {
  //     // Validate ObjectIds
  //     if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
  //       throw new Error("Invalid withdrawal ID");
  //     }
  //     if (!mongoose.Types.ObjectId.isValid(adminId)) {
  //       throw new Error("Invalid admin ID");
  //     }

  //       const session = await mongoose.startSession();
  //       session.startTransaction();

  //     const withdrawal = await WithdrawalRequest.findById(withdrawalId).populate("campaign");

  //     if (!withdrawal) {
  //       throw new Error("Withdrawal request not found");
  //     }

  //     if (withdrawal.status !== WithdrawalStatus.APPROVED) {
  //       throw new Error("Only approved requests can be marked as paid");
  //     }

  //     // Use transaction for data consistency
  //     const session = await mongoose.startSession();
  //     session.startTransaction();

  //       try {
  //     const withdrawal = await WithdrawalRequest.findById(withdrawalId).session(session);

  //     if (!withdrawal) {
  //       throw new Error("Withdrawal request not found");
  //     }

  //     if (withdrawal.status !== WithdrawalStatus.APPROVED) {
  //       throw new Error("Only approved requests can be marked as paid");
  //     }

  //     // Update withdrawal only
  //     withdrawal.status = WithdrawalStatus.PAID;
  //     withdrawal.paidAt = new Date();
  //     withdrawal.paymentReference = paymentReference?.trim();
  //     withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);

  //     await withdrawal.save({ session });

  //     await session.commitTransaction();
  //     return withdrawal;

  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw error;
  //   } finally {
  //     session.endSession();
  //   }
  // }
  async markAsPaid(
    withdrawalId: string,
    adminId: string,
    paymentReference?: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new ApiError("Invalid withdrawal ID", 400, "INVALID_WITHDRAWAL_ID");
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    // ✅ Declare session ONLY ONCE here
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const withdrawal =
        await WithdrawalRequest.findById(withdrawalId).session(session);

      if (!withdrawal) {
        throw new ApiError(
          "Withdrawal request not found",
          404,
          "WITHDRAWAL_NOT_FOUND",
        );
      }

      if (withdrawal.status !== WithdrawalStatus.APPROVED) {
        throw new ApiError(
          "Only approved requests can be marked as paid",
          400,
          "INVALID_WITHDRAWAL_STATUS",
        );
      }

      withdrawal.status = WithdrawalStatus.PAID;
      withdrawal.completedAt = new Date();
      withdrawal.transactionReference = paymentReference?.trim();
      withdrawal.reviewedAt = new Date();
      withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);

      const payoutBlock = await recordPayoutBlock({
        amount: withdrawal.amount,
        campaignId: withdrawal.campaign,
        paidDate: withdrawal.completedAt.toISOString(),
        withdrawalRequestId: withdrawal._id,
        transactionReference: withdrawal.transactionReference || undefined,
      });
      withdrawal.payoutBlockchainHash = payoutBlock.hash;

      await withdrawal.save({ session });

      await session.commitTransaction();

      try {
        await createInAppNotification({
          recipient: withdrawal.organizer,
          eventType: NotificationEventType.CAMPAIGN_WITHDRAWAL_COMPLETED,
          title: "Withdrawal Paid",
          message: "Your withdrawal request has been marked as paid.",
          payload: {
            withdrawalRequestId: withdrawal._id,
            campaignId: withdrawal.campaign,
            amount: withdrawal.amount,
            status: withdrawal.status,
            transactionReference: withdrawal.transactionReference,
            blockchainHash: withdrawal.payoutBlockchainHash,
          },
        });

        const campaign = await Campaign.findById(withdrawal.campaign).select(
          "title",
        );
        const campaignTitle = campaign?.title || "this campaign";
        const donorInAppResult = await notifyCampaignDonorsInApp({
          campaignId: withdrawal.campaign.toString(),
          withdrawalRequestId: withdrawal._id.toString(),
          campaignTitle,
          status: "completed",
          amount: withdrawal.amount,
          eventDate: withdrawal.completedAt || new Date(),
        });

        const donorEmailCount = await this.notifyDonorsByEmail({
          campaignId: withdrawal.campaign,
          campaignTitle,
          status: "completed",
          amount: withdrawal.amount,
          eventDate: withdrawal.completedAt || new Date(),
          transferReferenceMasked: this.maskTransactionReference(
            withdrawal.transactionReference,
          ),
        });

        const organizerUser = await User.findById(withdrawal.organizer).select(
          "name email",
        );
        if (organizerUser?.email) {
          await mailService.sendWithdrawalStatusEmail({
            to: organizerUser.email,
            name: organizerUser.name || "Organizer",
            campaignTitle,
            status: "completed",
            amount: withdrawal.amount,
            transactionReference: withdrawal.transactionReference,
          });
        }

        await this.createAuditLog({
          user: adminId,
          activityType: "withdrawal_completed",
          description: `Withdrawal marked paid for campaign ${campaignTitle}`,
          metadata: {
            withdrawalRequestId: withdrawal._id,
            campaignId: withdrawal.campaign,
            donorEmailCount,
            donorInAppCount: donorInAppResult.notifiedCount,
          },
          relatedEntity: {
            entityType: "WithdrawalRequest",
            entityId: withdrawal._id,
          },
        });
      } catch (notifyError) {
        console.error("Failed to notify withdrawal paid events:", notifyError);
      }

      return withdrawal;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async uploadWithdrawalDocument(
    file: UploadedDocumentFile | undefined,
    documentType?: string,
  ) {
    if (!file) {
      throw new ApiError("No file uploaded", 400, "WITHDRAWAL_FILE_REQUIRED");
    }

    if (!file.location || !file.key) {
      throw new ApiError(
        "Uploaded document metadata is missing",
        500,
        "WITHDRAWAL_FILE_METADATA_MISSING",
      );
    }

    return {
      message: "Document uploaded successfully",
      url: file.location,
      key: file.key,
      documentType: documentType || null,
    };
  }

  async getAvailableBalance(campaignId: string, organizerId: string) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "INVALID_CAMPAIGN_ID");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    if (campaign.owner.toString() !== organizerId) {
      throw new ApiError(
        "You don't own this campaign",
        403,
        "CAMPAIGN_ACCESS_DENIED",
      );
    }

    const [totalRaised, totalWithdrawn, availableBalance] = await Promise.all([
      this.getCampaignTotalDonations(campaignId),
      this.getCampaignTotalWithdrawn(campaignId),
      this.getCampaignAvailableBalance(campaignId),
    ]);

    return {
      campaignId,
      totalRaised,
      totalWithdrawn,
      availableBalance,
    };
  }

  async verifyWithdrawalDocument(
    withdrawalId: string,
    documentType: WithdrawalDocumentType,
    verified: boolean,
    adminId: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new ApiError("Invalid withdrawal ID", 400, "INVALID_WITHDRAWAL_ID");
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId);
    if (!withdrawal) {
      throw new ApiError(
        "Withdrawal request not found",
        404,
        "WITHDRAWAL_NOT_FOUND",
      );
    }

    if (!withdrawal.documents || !withdrawal.documents[documentType]) {
      throw new ApiError(
        "Document type not found in withdrawal request",
        400,
        "WITHDRAWAL_DOCUMENT_NOT_FOUND",
      );
    }

    (withdrawal.documents[documentType] as any).verified = verified;
    withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    await this.createAuditLog({
      user: adminId,
      activityType: "withdrawal_document_verification_updated",
      description: `Withdrawal document ${documentType} marked as ${verified ? "verified" : "unverified"}`,
      metadata: {
        withdrawalRequestId: withdrawal._id,
        documentType,
        verified,
      },
      relatedEntity: {
        entityType: "WithdrawalRequest",
        entityId: withdrawal._id,
      },
    });

    return withdrawal;
  }
}

export const withdrawalService = new WithdrawalService();
