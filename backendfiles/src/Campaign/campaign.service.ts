import { Campaign, ICampaign } from "../models/Campaign.model.js";
import { Donation } from "../models/Donation.model.js";
import { User } from "../models/User.model.js";
import { DonationStatus, Role } from "../types/enums.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createInAppNotification,
  NotificationEventType,
} from "../services/notification.service.js";
import { APIFeatures, QueryString } from "../utils/apiFeatures.js";
import mongoose from "mongoose";

interface CreateCampaignDTO {
  title: string;
  description?: string;
  imageURL?: string;
  images?: string[];
  target: number;
}

interface UpdateCampaignDTO {
  title?: string;
  description?: string;
  images?: string[];
  target?: number;
}

export class CampaignService {
  private isApproved(campaign: { status?: string }) {
    return campaign.status === "active" || campaign.status === "expired";
  }

  private isClosed(campaign: { status?: string }) {
    return campaign.status === "expired";
  }

  private enrichCampaign<T extends Record<string, any>>(campaign: T): T {
    return {
      ...campaign,
      isApproved: this.isApproved(campaign),
      isClosed: this.isClosed(campaign),
      fundingType: "flexible",
      images: campaign.imageURL ? [campaign.imageURL] : [],
    };
  }

  // Helper: Verify campaign ownership
  private async verifyCampaignOwnership(
    campaignId: string,
    userId: string,
    userRole: string,
  ): Promise<ICampaign> {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    if (userRole !== Role.ADMIN && campaign.owner.toString() !== userId) {
      throw new ApiError(
        "You don't have permission to perform this action",
        403,
        "CAMPAIGN_FORBIDDEN",
      );
    }

    return campaign;
  }

  // Create campaign (organizer only)
  async createCampaign(organizerId: string, campaignData: CreateCampaignDTO) {
    // Validate input
    if (!campaignData.title || !campaignData.target) {
      throw new ApiError(
        "Title and target amount are required",
        400,
        "CAMPAIGN_INVALID_INPUT",
      );
    }

    if (campaignData.target <= 0) {
      throw new ApiError(
        "Target amount must be greater than 0",
        400,
        "CAMPAIGN_INVALID_TARGET",
      );
    }

    // Verify user is an approved organizer
    const user = await User.findById(organizerId);
    if (!user || user.role !== Role.ORGANIZER || !user.isOrganizerApproved) {
      throw new ApiError(
        "Only approved organizers can create campaigns",
        403,
        "CAMPAIGN_ORGANIZER_NOT_APPROVED",
      );
    }

    const campaign = await Campaign.create({
      title: campaignData.title,
      description: campaignData.description || "",
      imageURL: campaignData.imageURL || campaignData.images?.[0] || "",
      target: campaignData.target,
      owner: organizerId,
      status: "inactive",
      isDonationEnabled: false,
    });

    return campaign;
  }

  // Get all campaigns (with filters and pagination)
  async getCampaigns(
    queryString: QueryString,
    userId?: string,
    userRole?: string,
  ) {
    // Build filter object for non-admin users
    const additionalFilters: any = {};

    // Non-admins can only see approved campaigns (unless viewing their own)
    if (userRole !== Role.ADMIN) {
      const owner = queryString.owner as string;
      if (owner && owner === userId) {
        // Organizer viewing their own campaigns
        additionalFilters.owner = new mongoose.Types.ObjectId(userId);
      } else {
        // Public view - only approved campaigns
        additionalFilters.status = { $in: ["active", "expired"] };
      }
    }

    // Apply additional filters (admin only for isApproved)
    if (queryString.isApproved !== undefined && userRole === Role.ADMIN) {
      additionalFilters.status =
        queryString.isApproved === "true"
          ? { $in: ["active", "expired"] }
          : "inactive";
    }

    if (queryString.isClosed !== undefined) {
      additionalFilters.status =
        queryString.isClosed === "true" ? "expired" : { $ne: "expired" };
    }

    // Merge additional filters into queryString
    const mergedQueryString = { ...queryString, ...additionalFilters };

    const features = new APIFeatures(Campaign, mergedQueryString)
      .filter()
      .search(["title", "description"])
      .sort()
      .limitFields()
      .paginate();

    const { results, pagination } = await features.exec();

    // Populate owner after query execution
    await Campaign.populate(results, {
      path: "owner",
      select: "name email image",
    });

    const campaigns = results.map((item: any) =>
      this.enrichCampaign(item.toObject ? item.toObject() : item),
    );

    return {
      campaigns,
      pagination,
    };
  }

  // Get single campaign
  async getCampaignById(
    campaignId: string,
    userId?: string,
    userRole?: string,
  ) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "CAMPAIGN_INVALID_ID");
    }

    const campaign = await Campaign.findById(campaignId)
      .populate("owner", "name email image phoneNumber")
      .lean();

    if (!campaign) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    // Check access permissions
    if (!this.isApproved(campaign) && userRole !== Role.ADMIN) {
      // Only owner or admin can view unapproved campaigns
      if (!userId || campaign.owner._id.toString() !== userId) {
        throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
      }
    }

    return this.enrichCampaign(campaign as any);
  }

  // Update campaign (owner or admin)
  async updateCampaign(
    campaignId: string,
    userId: string,
    userRole: string,
    updates: UpdateCampaignDTO,
  ) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "CAMPAIGN_INVALID_ID");
    }

    const campaign = await this.verifyCampaignOwnership(
      campaignId,
      userId,
      userRole,
    );

    // Validate updates
    const allowedUpdates: UpdateCampaignDTO = {};

    if (updates.title !== undefined) {
      if (
        typeof updates.title !== "string" ||
        updates.title.trim().length === 0
      ) {
        throw new ApiError(
          "Title must be a non-empty string",
          400,
          "CAMPAIGN_INVALID_TITLE",
        );
      }
      allowedUpdates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      allowedUpdates.description = updates.description;
    }

    if (updates.images !== undefined) {
      if (!Array.isArray(updates.images)) {
        throw new ApiError(
          "Images must be an array",
          400,
          "CAMPAIGN_INVALID_IMAGES",
        );
      }
      allowedUpdates.images = updates.images;
    }

    if (updates.target !== undefined) {
      const target = Number(updates.target);
      if (isNaN(target) || target <= 0) {
        throw new ApiError(
          "Target must be a positive number",
          400,
          "CAMPAIGN_INVALID_TARGET",
        );
      }
      allowedUpdates.target = target;
    }

    // Apply updates
    Object.assign(campaign, allowedUpdates);
    await campaign.save();

    return campaign;
  }

  // Approve campaign (admin only)
  async approveCampaign(campaignId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "CAMPAIGN_INVALID_ID");
    }

    const campaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { status: "active", isDonationEnabled: true },
      { new: true, runValidators: true },
    ).populate("owner", "name email");

    if (!campaign) {
      throw new ApiError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    }

    try {
      await createInAppNotification({
        recipient: campaign.owner as any,
        eventType: NotificationEventType.CAMPAIGN_APPROVED,
        title: "Campaign Approved",
        message: `Your campaign \"${campaign.title}\" is approved and now accepting donations.`,
        payload: {
          campaignId: campaign._id,
          campaignTitle: campaign.title,
          status: campaign.status,
        },
      });
    } catch (notifyError) {
      console.error(
        "Failed to create campaign approved notification:",
        notifyError,
      );
    }

    return campaign;
  }

  // Close campaign (owner or admin)
  async closeCampaign(campaignId: string, userId: string, userRole: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "CAMPAIGN_INVALID_ID");
    }

    const campaign = await this.verifyCampaignOwnership(
      campaignId,
      userId,
      userRole,
    );

    if (this.isClosed(campaign)) {
      throw new ApiError(
        "Campaign is already closed",
        400,
        "CAMPAIGN_ALREADY_CLOSED",
      );
    }

    campaign.status = "expired";
    campaign.endedAt = new Date();
    campaign.isDonationEnabled = false;
    await campaign.save();

    return campaign;
  }

  // Delete campaign (owner or admin)
  async deleteCampaign(campaignId: string, userId: string, userRole: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError("Invalid campaign ID", 400, "CAMPAIGN_INVALID_ID");
    }

    await this.verifyCampaignOwnership(campaignId, userId, userRole);

    // Prevent deletion if campaign has donations
    const hasCompletedDonations = await Donation.exists({
      campaign: campaignId,
      status: DonationStatus.COMPLETED,
    });

    if (hasCompletedDonations) {
      throw new ApiError(
        "Cannot delete campaign with existing donations",
        400,
        "CAMPAIGN_HAS_DONATIONS",
      );
    }

    await Campaign.findByIdAndDelete(campaignId);
    return { message: "Campaign deleted successfully" };
  }
}

export const campaignService = new CampaignService();
