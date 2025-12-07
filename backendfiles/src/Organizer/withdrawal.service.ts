import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { WithdrawalStatus, Role } from "../types/enums.js";
import mongoose from "mongoose";

interface CreateWithdrawalDTO {
  campaign: string;
  amountRequested: number;
  payoutMethod: string;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    branchName?: string;
    swiftCode?: string;
  };
  paypalEmail?: string;
  cryptoDetails?: {
    walletAddress?: string;
    network?: string;
  };
  reason?: string;
}

interface WithdrawalFilters {
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
}

export class WithdrawalService {
  // Create withdrawal request (organizer only)
  async createWithdrawalRequest(organizerId: string, withdrawalData: CreateWithdrawalDTO) {
    // Validate required fields
    if (!withdrawalData.campaign || !withdrawalData.amountRequested || !withdrawalData.payoutMethod) {
      throw new Error("Campaign, amount requested, and payout method are required");
    }

    // Validate amount
    const amountRequested = Number(withdrawalData.amountRequested);
    if (isNaN(amountRequested) || amountRequested <= 0) {
      throw new Error("Amount requested must be a positive number");
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new Error("Invalid organizer ID");
    }
    if (!mongoose.Types.ObjectId.isValid(withdrawalData.campaign)) {
      throw new Error("Invalid campaign ID");
    }

    // Verify campaign ownership
    const campaignDoc = await Campaign.findById(withdrawalData.campaign);
    if (!campaignDoc) {
      throw new Error("Campaign not found");
    }

    if (campaignDoc.owner.toString() !== organizerId) {
      throw new Error("You don't own this campaign");
    }

    if (!campaignDoc.isApproved) {
      throw new Error("Campaign must be approved before requesting withdrawal");
    }

    // Check if amount is available
    if (amountRequested > campaignDoc.raised) {
      throw new Error(
        `Requested amount (${amountRequested}) exceeds available funds (${campaignDoc.raised})`
      );
    }

    // Check for pending or approved withdrawal requests
    const existingRequest = await WithdrawalRequest.findOne({
      campaign: withdrawalData.campaign,
      status: { $in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED] },
    });

    if (existingRequest) {
      throw new Error(
        "You already have a pending or approved withdrawal request for this campaign"
      );
    }

    const withdrawal = await WithdrawalRequest.create({
      organizer: organizerId,
      campaign: withdrawalData.campaign,
      amountRequested,
      payoutMethod: withdrawalData.payoutMethod,
      bankDetails: withdrawalData.bankDetails,
      paypalEmail: withdrawalData.paypalEmail,
      cryptoDetails: withdrawalData.cryptoDetails,
      reason: withdrawalData.reason,
      status: WithdrawalStatus.PENDING,
    });

    return withdrawal;
  }

  // Get withdrawal requests by organizer
  async getOrganizerWithdrawals(organizerId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new Error("Invalid organizer ID");
    }

    return WithdrawalRequest.find({ organizer: organizerId })
      .populate("campaign", "title raised target")
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get all withdrawal requests (admin only)
  async getAllWithdrawals(filters: WithdrawalFilters = {}) {
    const query: any = {};

    // Filter by status
    if (filters.status && Object.values(WithdrawalStatus).includes(filters.status)) {
      query.status = filters.status;
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      WithdrawalRequest.find(query)
        .populate("organizer", "name email phoneNumber")
        .populate("campaign", "title raised target")
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
  async getWithdrawalById(withdrawalId: string, userId: string, userRole: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new Error("Invalid withdrawal ID");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId)
      .populate("organizer", "name email phoneNumber")
      .populate("campaign", "title raised target owner")
      .populate("reviewedBy", "name email")
      .lean();

    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    // Check access permissions
    if (userRole !== Role.ADMIN && withdrawal.organizer._id.toString() !== userId) {
      throw new Error("Access denied");
    }

    return withdrawal;
  }

  // Approve withdrawal (admin only)
  async approveWithdrawal(withdrawalId: string, adminId: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new Error("Invalid withdrawal ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId);

    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error("Only pending requests can be approved");
    }

    withdrawal.status = WithdrawalStatus.APPROVED;
    withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);
    await withdrawal.save();

    return withdrawal;
  }

  // Reject withdrawal (admin only)
  async rejectWithdrawal(withdrawalId: string, adminId: string, adminMessage?: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new Error("Invalid withdrawal ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId);

    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error("Only pending requests can be rejected");
    }

    withdrawal.status = WithdrawalStatus.REJECTED;
    withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);
    withdrawal.adminMessage = adminMessage?.trim() || "Withdrawal request rejected";
    await withdrawal.save();

    return withdrawal;
  }

  // Mark as paid (admin only)
  async markAsPaid(withdrawalId: string, adminId: string, paymentReference?: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      throw new Error("Invalid withdrawal ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    const withdrawal = await WithdrawalRequest.findById(withdrawalId).populate("campaign");

    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      throw new Error("Only approved requests can be marked as paid");
    }

    // Use transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update withdrawal status
      withdrawal.status = WithdrawalStatus.PAID;
      withdrawal.paidAt = new Date();
      withdrawal.paymentReference = paymentReference?.trim();
      withdrawal.reviewedBy = new mongoose.Types.ObjectId(adminId);
      await withdrawal.save({ session });

      // Deduct amount from campaign raised (with safety check)
      const campaign = await Campaign.findById(withdrawal.campaign);
      if (campaign) {
        const newRaised = Math.max(0, campaign.raised - withdrawal.amountRequested);
        campaign.raised = newRaised;
        await campaign.save({ session });
      }

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
