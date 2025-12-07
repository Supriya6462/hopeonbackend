import { Campaign, ICampaign } from "../models/Campaign.model.js";
import { User } from "../models/User.model.js";
import { Role } from "../types/enums.js";
import mongoose from "mongoose";

interface CreateCampaignDTO {
  title: string;
  description?: string;
  images?: string[];
  target: number;
}

interface UpdateCampaignDTO {
  title?: string;
  description?: string;
  images?: string[];
  target?: number;
}

interface CampaignFilters {
  owner?: string;
  isApproved?: boolean;
  isClosed?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class CampaignService {
  // Helper: Verify campaign ownership
  private async verifyCampaignOwnership(
    campaignId: string,
    userId: string,
    userRole: string
  ): Promise<ICampaign> {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (userRole !== Role.ADMIN && campaign.owner.toString() !== userId) {
      throw new Error("You don't have permission to perform this action");
    }

    return campaign;
  }

  // Create campaign (organizer only)
  async createCampaign(organizerId: string, campaignData: CreateCampaignDTO) {
    // Validate input
    if (!campaignData.title || !campaignData.target) {
      throw new Error("Title and target amount are required");
    }

    if (campaignData.target <= 0) {
      throw new Error("Target amount must be greater than 0");
    }

    // Verify user is an approved organizer
    const user = await User.findById(organizerId);
    if (!user || user.role !== Role.ORGANIZER || !user.isOrganizerApproved) {
      throw new Error("Only approved organizers can create campaigns");
    }

    const campaign = await Campaign.create({
      title: campaignData.title,
      description: campaignData.description,
      images: campaignData.images || [],
      target: campaignData.target,
      owner: organizerId,
      isApproved: false,
      raised: 0,
      isClosed: false,
    });

    return campaign;
  }

  // Get all campaigns (with filters and pagination)
  async getCampaigns(filters: CampaignFilters = {}, userId?: string, userRole?: string) {
    const query: any = {};

    // Non-admins can only see approved campaigns (unless viewing their own)
    if (userRole !== Role.ADMIN) {
      if (filters.owner && filters.owner === userId) {
        // Organizer viewing their own campaigns
        query.owner = new mongoose.Types.ObjectId(userId);
      } else {
        // Public view - only approved campaigns
        query.isApproved = true;
      }
    }

    // Apply additional filters (admin only for isApproved)
    if (filters.isApproved !== undefined && userRole === Role.ADMIN) {
      query.isApproved = filters.isApproved;
    }

    if (filters.isClosed !== undefined) {
      query.isClosed = filters.isClosed;
    }

    // Text search (sanitized)
    if (filters.search && typeof filters.search === "string") {
      const searchTerm = filters.search.trim();
      if (searchTerm) {
        query.$text = { $search: searchTerm };
      }
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate("owner", "name email image")
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

  // Get single campaign
  async getCampaignById(campaignId: string, userId?: string, userRole?: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    const campaign = await Campaign.findById(campaignId)
      .populate("owner", "name email image phoneNumber")
      .lean();

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check access permissions
    if (!campaign.isApproved && userRole !== Role.ADMIN) {
      // Only owner or admin can view unapproved campaigns
      if (!userId || campaign.owner._id.toString() !== userId) {
        throw new Error("Campaign not found");
      }
    }

    return campaign;
  }

  // Update campaign (owner or admin)
  async updateCampaign(
    campaignId: string,
    userId: string,
    userRole: string,
    updates: UpdateCampaignDTO
  ) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    const campaign = await this.verifyCampaignOwnership(campaignId, userId, userRole);

    // Validate updates
    const allowedUpdates: UpdateCampaignDTO = {};

    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || updates.title.trim().length === 0) {
        throw new Error("Title must be a non-empty string");
      }
      allowedUpdates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      allowedUpdates.description = updates.description;
    }

    if (updates.images !== undefined) {
      if (!Array.isArray(updates.images)) {
        throw new Error("Images must be an array");
      }
      allowedUpdates.images = updates.images;
    }

    if (updates.target !== undefined) {
      const target = Number(updates.target);
      if (isNaN(target) || target <= 0) {
        throw new Error("Target must be a positive number");
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
      throw new Error("Invalid campaign ID");
    }

    const campaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { isApproved: true },
      { new: true, runValidators: true }
    ).populate("owner", "name email");

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    return campaign;
  }

  // Close campaign (owner or admin)
  async closeCampaign(campaignId: string, userId: string, userRole: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    const campaign = await this.verifyCampaignOwnership(campaignId, userId, userRole);

    if (campaign.isClosed) {
      throw new Error("Campaign is already closed");
    }

    campaign.isClosed = true;
    await campaign.save();

    return campaign;
  }

  // Delete campaign (owner or admin)
  async deleteCampaign(campaignId: string, userId: string, userRole: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    const campaign = await this.verifyCampaignOwnership(campaignId, userId, userRole);

    // Prevent deletion if campaign has donations
    if (campaign.raised > 0) {
      throw new Error("Cannot delete campaign with existing donations");
    }

    await Campaign.findByIdAndDelete(campaignId);
    return { message: "Campaign deleted successfully" };
  }
}

export const campaignService = new CampaignService();
