import { OrganizerApplication } from "../models/OrganizerApplication.model.js";
import { User } from "../models/User.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import { ApplicationStatus, Role, OrganizationType, WithdrawalStatus } from "../types/enums.js";
import mongoose from "mongoose";

interface SubmitApplicationDTO {
  organizationName: string;
  description: string;
  contactEmail?: string;
  phoneNumber?: string;
  website?: string;
  organizationType?: OrganizationType;
  documents?: any;
}

interface ApplicationFilters {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

export class OrganizerService {
  // Submit organizer application
  async submitApplication(userId: string, applicationData: SubmitApplicationDTO) {
    // Validate required fields
    if (!applicationData.organizationName || !applicationData.description) {
      throw new Error("Organization name and description are required");
    }

    if (applicationData.organizationName.trim().length < 3) {
      throw new Error("Organization name must be at least 3 characters");
    }

    if (applicationData.description.trim().length < 20) {
      throw new Error("Description must be at least 20 characters");
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    // Check if user already has a pending or approved application
    const existingApp = await OrganizerApplication.findOne({
      user: userId,
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] },
    });

    if (existingApp) {
      throw new Error("You already have a pending or approved application");
    }

    const application = await OrganizerApplication.create({
      user: userId,
      organizationName: applicationData.organizationName.trim(),
      description: applicationData.description.trim(),
      contactEmail: applicationData.contactEmail,
      phoneNumber: applicationData.phoneNumber,
      website: applicationData.website,
      organizationType: applicationData.organizationType || OrganizationType.OTHER,
      documents: applicationData.documents,
      status: ApplicationStatus.PENDING,
    });

    return application;
  }

  // Get user's applications
  async getUserApplications(userId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    return OrganizerApplication.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get all applications (admin only)
  async getAllApplications(filters: ApplicationFilters = {}) {
    const query: any = {};

    // Filter by status
    if (filters.status && Object.values(ApplicationStatus).includes(filters.status)) {
      query.status = filters.status;
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      OrganizerApplication.find(query)
        .populate("user", "name email phoneNumber")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrganizerApplication.countDocuments(query),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get single application
  async getApplicationById(applicationId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new Error("Invalid application ID");
    }

    const application = await OrganizerApplication.findById(applicationId)
      .populate("user", "name email phoneNumber image")
      .populate("reviewedBy", "name email")
      .lean();

    if (!application) {
      throw new Error("Application not found");
    }

    return application;
  }

  // Approve application (admin only)
  async approveApplication(applicationId: string, adminId: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new Error("Invalid application ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    const application = await OrganizerApplication.findById(applicationId);

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error("Only pending applications can be approved");
    }

    // Use transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update application status
      application.status = ApplicationStatus.APPROVED;
      application.reviewedBy = new mongoose.Types.ObjectId(adminId);
      application.reviewedAt = new Date();
      await application.save({ session });

      // Update user role and approval status
      await User.findByIdAndUpdate(
        application.user,
        {
          role: Role.ORGANIZER,
          isOrganizerApproved: true,
        },
        { session }
      );

      await session.commitTransaction();
      return application;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Reject application (admin only)
  async rejectApplication(
    applicationId: string,
    adminId: string,
    rejectionReason?: string
  ) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new Error("Invalid application ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    const application = await OrganizerApplication.findById(applicationId);

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error("Only pending applications can be rejected");
    }

    application.status = ApplicationStatus.REJECTED;
    application.reviewedBy = new mongoose.Types.ObjectId(adminId);
    application.reviewedAt = new Date();
    application.rejectionReason = rejectionReason?.trim() || "Application rejected by admin";
    await application.save();

    return application;
  }

  // Revoke organizer privileges (admin only)
  async revokeOrganizer(organizerId: string, adminId: string, revocationReason: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new Error("Invalid organizer ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    // Validate reason
    if (!revocationReason || revocationReason.trim().length < 10) {
      throw new Error("Revocation reason must be at least 10 characters");
    }

    const user = await User.findById(organizerId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== Role.ORGANIZER) {
      throw new Error("User is not an organizer");
    }

    if (user.isOrganizerRevoked) {
      throw new Error("Organizer is already revoked");
    }

    // Use transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Revoke organizer privileges
      user.isOrganizerRevoked = true;
      user.revokedAt = new Date();
      user.revokedBy = new mongoose.Types.ObjectId(adminId);
      user.revocationReason = revocationReason.trim();
      await user.save({ session });

      // Close all active campaigns by this organizer
      await Campaign.updateMany(
        { owner: organizerId, isClosed: false },
        { 
          isClosed: true,
          $set: { closedReason: "Organizer account revoked" }
        },
        { session }
      );

      // Reject all pending withdrawal requests
      await WithdrawalRequest.updateMany(
        { organizer: organizerId, status: WithdrawalStatus.PENDING },
        {
          status: WithdrawalStatus.REJECTED,
          adminMessage: "Organizer account has been revoked",
          reviewedBy: adminId,
        },
        { session }
      );

      await session.commitTransaction();

      return {
        user,
        message: "Organizer privileges revoked successfully",
        actionsPerformed: {
          campaignsClosed: true,
          pendingWithdrawalsRejected: true,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Reinstate organizer privileges (admin only)
  async reinstateOrganizer(organizerId: string, adminId: string) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new Error("Invalid organizer ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID");
    }

    const user = await User.findById(organizerId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== Role.ORGANIZER) {
      throw new Error("User is not an organizer");
    }

    if (!user.isOrganizerRevoked) {
      throw new Error("Organizer is not revoked");
    }

    // Reinstate organizer
    user.isOrganizerRevoked = false;
    user.revokedAt = undefined;
    user.revokedBy = undefined;
    user.revocationReason = undefined;
    await user.save();

    return {
      user,
      message: "Organizer privileges reinstated successfully",
      note: "Previously closed campaigns remain closed. Organizer can create new campaigns.",
    };
  }

  // Get all organizers (admin only)
  async getAllOrganizers(filters: { status?: string; page?: number; limit?: number } = {}) {
    const query: any = { role: Role.ORGANIZER };

    // Filter by status
    if (filters.status === "active") {
      query.isOrganizerApproved = true;
      query.isOrganizerRevoked = false;
    } else if (filters.status === "revoked") {
      query.isOrganizerRevoked = true;
    } else if (filters.status === "pending") {
      query.isOrganizerApproved = false;
      query.isOrganizerRevoked = false;
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [organizers, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash -resetToken -resetTokenExpiry")
        .populate("revokedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      organizers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export const organizerService = new OrganizerService();
