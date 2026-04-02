import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { WithdrawalStatus, Role, DonationStatus } from "../types/enums.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { Donation } from "../models/Donation.model.js";

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

export class WithdrawalService {
  private isCampaignApproved(campaign: { status?: string }) {
    return campaign.status === "active" || campaign.status === "expired";
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
    const availableBalance = await this.getCampaignAvailableBalance(
      withdrawalData.campaign,
    );

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
      campaign: withdrawalData.campaign,
      amount: amountRequested,
      availableBalanceSnapshot: availableBalance, // Record the available balance at time of request
      bankDetails: withdrawalData.bankDetails,
      documents: withdrawalData.documents,
      kycInfo: withdrawalData.kycInfo,
      reviewNotes: withdrawalData.reason,
      status: WithdrawalStatus.REQUESTED,
    });

    await withdrawal.save();

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
    await withdrawal.save();

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

      await withdrawal.save({ session });

      await session.commitTransaction();

      return withdrawal;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const withdrawalService = new WithdrawalService();
