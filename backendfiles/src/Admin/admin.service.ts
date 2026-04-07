import mongoose from "mongoose";
import { User } from "../models/User.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { Donation } from "../models/Donation.model.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import { OrganizerApplication } from "../models/OrganizerApplication.model.js";
import ActivityLog from "../models/ActivityLog.js";
import { Role } from "../types/enums.js";
import { ApiError } from "../utils/ApiError.js";
import { organizerService } from "../Organizer/organizer.service.js";
import { withdrawalService } from "../Organizer/withdrawal.service.js";

type PaginationInput = {
  page?: number;
  limit?: number;
};

type UserListInput = PaginationInput & {
  role?: Role;
  search?: string;
};

type CampaignListInput = PaginationInput & {
  search?: string;
};

type DonationListInput = PaginationInput & {
  status?: "COMPLETED" | "PENDING" | "FAILED";
};

type ActivityListInput = PaginationInput & {
  activityType?: string;
  userId?: string;
};

type WithdrawalListInput = PaginationInput & {
  status?: string;
  organizerId?: string;
  campaignId?: string;
  minAmount?: number;
  maxAmount?: number;
  fromDate?: string;
  toDate?: string;
};

class AdminService {
  private getPagination(input: PaginationInput, defaultLimit = 20, max = 100) {
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.min(
      max,
      Math.max(1, Number(input.limit) || defaultLimit),
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalDonors,
      totalOrganizers,
      totalCampaigns,
      activeCampaigns,
      pendingWithdrawals,
      pendingApplications,
      donationAggregate,
      withdrawnAggregate,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: Role.DONOR }),
      User.countDocuments({ role: Role.ORGANIZER, isOrganizerApproved: true }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: "active" }),
      WithdrawalRequest.countDocuments({ status: "pending" }),
      OrganizerApplication.countDocuments({ status: "pending" }),
      Donation.aggregate([
        { $match: { status: "COMPLETED" } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]),
    ]);

    return {
      users: {
        total: totalUsers,
        donors: totalDonors,
        organizers: totalOrganizers,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
      },
      donations: {
        count: donationAggregate[0]?.count || 0,
        totalAmount: donationAggregate[0]?.totalAmount || 0,
      },
      withdrawals: {
        pending: pendingWithdrawals,
        totalWithdrawn: withdrawnAggregate[0]?.totalAmount || 0,
      },
      applications: {
        pending: pendingApplications,
      },
    };
  }

  async listUsers(input: UserListInput) {
    const { page, limit, skip } = this.getPagination(input);
    const query: Record<string, unknown> = {};

    if (input.role) {
      query.role = input.role;
    }

    if (input.search?.trim()) {
      const search = input.search.trim();
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash -resetToken -resetTokenExpiry")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    const user = await User.findById(userId)
      .select("-passwordHash -resetToken -resetTokenExpiry")
      .lean();

    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    const [campaigns, donations, activities, withdrawalRequests] =
      await Promise.all([
        user.role === Role.ORGANIZER
          ? Campaign.find({ owner: user._id }).sort({ createdAt: -1 }).lean()
          : [],
        Donation.find({ donor: user._id })
          .populate("campaign", "title imageURL")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        ActivityLog.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(25)
          .lean(),
        user.role === Role.ORGANIZER
          ? WithdrawalRequest.find({ organizer: user._id })
              .populate("campaign", "title")
              .sort({ createdAt: -1 })
              .lean()
          : [],
      ]);

    return {
      user,
      campaigns,
      donations,
      activities,
      withdrawalRequests,
    };
  }

  async updateUserStatus(
    userId: string,
    adminUserId: string,
    input: { role?: Role; isOrganizerApproved?: boolean },
  ) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    if (
      input.role &&
      adminUserId === user._id.toString() &&
      input.role !== Role.ADMIN
    ) {
      throw new ApiError(
        "Admin cannot remove own admin role",
        400,
        "ADMIN_ROLE_SELF_DOWNGRADE_FORBIDDEN",
      );
    }

    if (input.role === Role.ORGANIZER && input.isOrganizerApproved === false) {
      throw new ApiError(
        "Organizer role requires isOrganizerApproved=true",
        400,
        "INVALID_ORGANIZER_APPROVAL_STATE",
      );
    }

    if (typeof input.isOrganizerApproved === "boolean") {
      user.isOrganizerApproved = input.isOrganizerApproved;
    }

    if (input.role) {
      user.role = input.role;
    }

    await user.save();

    await ActivityLog.create({
      user: adminUserId,
      activityType: "profile_updated",
      description: `Admin updated user ${user.email} status`,
      metadata: {
        targetUserId: user._id,
        role: input.role,
        isOrganizerApproved: input.isOrganizerApproved,
      },
    });

    return user;
  }

  async getUserDonations(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    const donations = await Donation.find({
      donor: userId,
      status: "COMPLETED",
    })
      .populate("campaign", "title imageURL")
      .sort({ createdAt: -1 })
      .lean();

    return {
      donations,
      totalAmount: donations.reduce(
        (sum, donation) => sum + donation.amount,
        0,
      ),
      totalCount: donations.length,
    };
  }

  async listCampaigns(input: CampaignListInput) {
    const { page, limit, skip } = this.getPagination(input);
    const query: Record<string, unknown> = {};

    if (input.search?.trim()) {
      const search = input.search.trim();
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(query),
    ]);

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getCampaignDetails(campaignId: string) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "INVALID_CAMPAIGN_ID");
    }

    const campaign = await Campaign.findById(campaignId)
      .populate("owner", "name email")
      .lean();

    if (!campaign) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    const [donations, withdrawalRequests] = await Promise.all([
      Donation.find({ campaign: campaign._id })
        .populate("donor", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      WithdrawalRequest.find({ campaign: campaign._id })
        .populate("organizer", "name email")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      campaign,
      donations,
      withdrawalRequests,
    };
  }

  async deactivateCampaign(campaignId: string, adminUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "INVALID_CAMPAIGN_ID");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    campaign.status = "inactive";
    campaign.isDonationEnabled = false;
    campaign.endedAt = campaign.endedAt || new Date();
    await campaign.save();

    await ActivityLog.create({
      user: adminUserId,
      activityType: "campaign_deleted",
      description: `Admin marked campaign \"${campaign.title}\" as inactive`,
      metadata: {
        campaignId: campaign._id,
        campaignTitle: campaign.title,
        status: "inactive",
      },
    });

    return campaign;
  }

  async listDonations(input: DonationListInput) {
    const { page, limit, skip } = this.getPagination(input);
    const query: Record<string, unknown> = {};

    if (input.status) {
      query.status = input.status;
    }

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate("donor", "name email")
        .populate("campaign", "title owner")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Donation.countDocuments(query),
    ]);

    return {
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async listActivities(input: ActivityListInput) {
    const { page, limit, skip } = this.getPagination(input, 50, 200);
    const query: Record<string, unknown> = {};

    if (input.activityType?.trim()) {
      query.activityType = input.activityType.trim();
    }

    if (input.userId) {
      query.user = input.userId;
    }

    const [activities, total] = await Promise.all([
      ActivityLog.find(query)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async listApplications(input: PaginationInput & { status?: string }) {
    return organizerService.getAllApplications(input as any);
  }

  async getApplicationById(applicationId: string) {
    return organizerService.getApplicationById(applicationId);
  }

  async approveApplication(
    applicationId: string,
    adminId: string,
    adminNotes?: string,
  ) {
    return organizerService.approveApplication(
      applicationId,
      adminId,
      adminNotes,
    );
  }

  async rejectApplication(
    applicationId: string,
    adminId: string,
    rejectionReason: string,
    adminNotes?: string,
  ) {
    return organizerService.rejectApplication(
      applicationId,
      adminId,
      rejectionReason,
      adminNotes,
    );
  }

  async revokeOrganizer(
    organizerId: string,
    adminId: string,
    revocationReason: string,
  ) {
    return organizerService.revokeOrganizer(
      organizerId,
      adminId,
      revocationReason,
    );
  }

  async reinstateOrganizer(organizerId: string, adminId: string) {
    return organizerService.reinstateOrganizer(organizerId, adminId);
  }

  async listWithdrawals(input: WithdrawalListInput) {
    return withdrawalService.getAllWithdrawals(input as any);
  }

  async getWithdrawalDetails(withdrawalId: string, adminId: string) {
    return withdrawalService.getWithdrawalById(
      withdrawalId,
      adminId,
      Role.ADMIN,
    );
  }

  async moveWithdrawalToUnderReview(
    withdrawalId: string,
    adminId: string,
    reviewNotes?: string,
  ) {
    return withdrawalService.moveToUnderReview(
      withdrawalId,
      adminId,
      reviewNotes,
    );
  }

  async approveWithdrawal(withdrawalId: string, adminId: string) {
    return withdrawalService.approveWithdrawal(withdrawalId, adminId);
  }

  async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminMessage?: string,
  ) {
    return withdrawalService.rejectWithdrawal(
      withdrawalId,
      adminId,
      adminMessage,
    );
  }

  async completeWithdrawal(
    withdrawalId: string,
    adminId: string,
    paymentReference?: string,
  ) {
    return withdrawalService.markAsPaid(
      withdrawalId,
      adminId,
      paymentReference,
    );
  }

  async getWithdrawalAuditLog(
    withdrawalId: string,
    page?: number,
    limit?: number,
  ) {
    return withdrawalService.getWithdrawalAuditLog(withdrawalId, {
      page,
      limit,
    });
  }

  async bulkMoveWithdrawalsToUnderReview(
    withdrawalIds: string[],
    adminId: string,
    reviewNotes?: string,
  ) {
    const results = await Promise.all(
      withdrawalIds.map(async (withdrawalId) => {
        try {
          const withdrawal = await this.moveWithdrawalToUnderReview(
            withdrawalId,
            adminId,
            reviewNotes,
          );
          return { withdrawalId, success: true, data: withdrawal };
        } catch (error: any) {
          return {
            withdrawalId,
            success: false,
            error:
              error?.message || "Failed to move withdrawal to under review",
            code: error?.code || "BULK_OPERATION_ERROR",
          };
        }
      }),
    );

    return {
      summary: {
        total: results.length,
        successCount: results.filter((item) => item.success).length,
        failedCount: results.filter((item) => !item.success).length,
      },
      results,
    };
  }

  async bulkApproveWithdrawals(withdrawalIds: string[], adminId: string) {
    const results = await Promise.all(
      withdrawalIds.map(async (withdrawalId) => {
        try {
          const withdrawal = await this.approveWithdrawal(
            withdrawalId,
            adminId,
          );
          return { withdrawalId, success: true, data: withdrawal };
        } catch (error: any) {
          return {
            withdrawalId,
            success: false,
            error: error?.message || "Failed to approve withdrawal",
            code: error?.code || "BULK_OPERATION_ERROR",
          };
        }
      }),
    );

    return {
      summary: {
        total: results.length,
        successCount: results.filter((item) => item.success).length,
        failedCount: results.filter((item) => !item.success).length,
      },
      results,
    };
  }

  async bulkRejectWithdrawals(
    withdrawalIds: string[],
    adminId: string,
    adminMessage: string,
  ) {
    const results = await Promise.all(
      withdrawalIds.map(async (withdrawalId) => {
        try {
          const withdrawal = await this.rejectWithdrawal(
            withdrawalId,
            adminId,
            adminMessage,
          );
          return { withdrawalId, success: true, data: withdrawal };
        } catch (error: any) {
          return {
            withdrawalId,
            success: false,
            error: error?.message || "Failed to reject withdrawal",
            code: error?.code || "BULK_OPERATION_ERROR",
          };
        }
      }),
    );

    return {
      summary: {
        total: results.length,
        successCount: results.filter((item) => item.success).length,
        failedCount: results.filter((item) => !item.success).length,
      },
      results,
    };
  }
}

export const adminService = new AdminService();
