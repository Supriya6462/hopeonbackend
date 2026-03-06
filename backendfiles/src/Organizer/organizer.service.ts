import { OrganizerApplication } from "../models/OrganizerApplication.model.js";
import { User } from "../models/User.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import {
  ApplicationStatus,
  Role,
  OrganizationType,
  WithdrawalStatus,
} from "../types/enums.js";
import mongoose from "mongoose";
import { uploadToS3 } from "../utils/s3Upload.util.js";
import { ApiError } from "../utils/ApiError.js";
import { mailService } from "../mail/mail.service.js";

interface SubmitApplicationDTO {
  organizationName: string;
  description: string;
  contactEmail?: string;
  phoneNumber?: string;
  website?: string;
  organizationType?: OrganizationType;
  documents?: any;
}

interface DocumentFiles {
  governmentId?: Express.Multer.File[];
  selfieWithId?: Express.Multer.File[];
  registrationCertificate?: Express.Multer.File[];
  taxId?: Express.Multer.File[];
  addressProof?: Express.Multer.File[];
  additionalDocuments?: Express.Multer.File[];
}

interface ApplicationFilters {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

export class OrganizerService {
  // Submit organizer application
  async submitApplication(
    userId: string,
    applicationData: SubmitApplicationDTO,
  ) {
    // Validate required fields
    if (!applicationData.organizationName || !applicationData.description) {
      throw new ApiError(
        "Organization name and description are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (applicationData.organizationName.trim().length < 3) {
      throw new ApiError(
        "Organization name must be at least 3 characters",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (applicationData.description.trim().length < 20) {
      throw new ApiError(
        "Description must be at least 20 characters",
        400,
        "VALIDATION_ERROR",
      );
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    // Check if user already has a pending or approved application
    const existingApp = await OrganizerApplication.findOne({
      user: userId,
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] },
    });

    if (existingApp) {
      throw new ApiError(
        "You already have a pending or approved application",
        409,
        "APPLICATION_EXISTS",
      );
    }

    const application = await OrganizerApplication.create({
      user: userId,
      organizationName: applicationData.organizationName.trim(),
      description: applicationData.description.trim(),
      contactEmail: applicationData.contactEmail,
      phoneNumber: applicationData.phoneNumber,
      website: applicationData.website,
      organizationType:
        applicationData.organizationType || OrganizationType.OTHER,
      documents: applicationData.documents,
      status: ApplicationStatus.PENDING,
    });

    return application;
  }

  //upload documents and submit during applying
  // Step 1: Create draft application (Form 1 - basic info)
  async createDraftApplication(
    userId: string,
    applicationData: SubmitApplicationDTO,
  ) {
    if (!applicationData.organizationName || !applicationData.description) {
      throw new ApiError(
        "Organization name and description are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (applicationData.organizationName.trim().length < 3) {
      throw new ApiError(
        "Organization name must be at least 3 characters",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (applicationData.description.trim().length < 20) {
      throw new ApiError(
        "Description must be at least 20 characters",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    const existingApp = await OrganizerApplication.findOne({
      user: userId,
      status: {
        $in: [
          ApplicationStatus.DRAFT,
          ApplicationStatus.PENDING,
          ApplicationStatus.APPROVED,
        ],
      },
    });

    if (existingApp) {
      if (existingApp.status === ApplicationStatus.DRAFT) {
        // Update existing draft
        existingApp.organizationName = applicationData.organizationName.trim();
        existingApp.description = applicationData.description.trim();
        existingApp.contactEmail = applicationData.contactEmail;
        existingApp.phoneNumber = applicationData.phoneNumber;
        existingApp.website = applicationData.website;
        existingApp.organizationType =
          applicationData.organizationType || OrganizationType.OTHER;
        await existingApp.save();
        return { application: existingApp, isUpdate: true };
      }
      throw new ApiError(
        "You already have a pending or approved application",
        409,
        "APPLICATION_EXISTS",
      );
    }

    const application = await OrganizerApplication.create({
      user: userId,
      organizationName: applicationData.organizationName.trim(),
      description: applicationData.description.trim(),
      contactEmail: applicationData.contactEmail,
      phoneNumber: applicationData.phoneNumber,
      website: applicationData.website,
      organizationType:
        applicationData.organizationType || OrganizationType.OTHER,
      status: ApplicationStatus.DRAFT,
    });

    return { application, isUpdate: false };
  }

  // Step 2: Upload documents and submit (Form 2 - documents)
  async uploadDocumentsAndSubmit(
    userId: string,
    applicationId: string,
    files: DocumentFiles,
  ) {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new ApiError(
        "Invalid application ID",
        400,
        "INVALID_APPLICATION_ID",
      );
    }

    const application = await OrganizerApplication.findOne({
      _id: applicationId,
      user: userId,
    }).populate("user", "name email");

    if (!application) {
      throw new ApiError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ApiError(
        "Can only upload documents to draft applications",
        400,
        "INVALID_APPLICATION_STATUS",
      );
    }

    // Validate required documents
    if (!files.governmentId?.[0] || !files.selfieWithId?.[0]) {
      throw new ApiError(
        "Government ID and Selfie with ID are required",
        400,
        "MISSING_REQUIRED_DOCUMENTS",
      );
    }

    // Additional validation for specific organization types
    if (
      (application.organizationType === OrganizationType.NONPROFIT ||
        application.organizationType === OrganizationType.CHARITY) &&
      !files.registrationCertificate?.[0]
    ) {
      throw new ApiError(
        "Registration certificate is required for nonprofit/charity organizations",
        400,
        "MISSING_REGISTRATION_CERTIFICATE",
      );
    }

    const uploadFolder = `organizer-documents/${userId}/${applicationId}`;
    const documents: any = {};

    // Upload single documents
    const singleDocFields = [
      "governmentId",
      "selfieWithId",
      "registrationCertificate",
      "taxId",
      "addressProof",
    ] as const;

    for (const field of singleDocFields) {
      if (files[field]?.[0]) {
        const file = files[field]![0];
        const result = await uploadToS3(
          file.buffer,
          `${uploadFolder}/${field}`,
          file.originalname,
          file.mimetype,
        );
        documents[field] = {
          url: result.url,
          publicId: result.key,
          uploadedAt: result.uploadedAt,
        };
      }
    }

    // Upload additional documents (array)
    if (files.additionalDocuments?.length) {
      documents.additionalDocuments = [];
      for (const file of files.additionalDocuments) {
        const result = await uploadToS3(
          file.buffer,
          `${uploadFolder}/additional`,
          file.originalname,
          file.mimetype,
        );
        documents.additionalDocuments.push({
          name: file.originalname,
          url: result.url,
          publicId: result.key,
          uploadedAt: result.uploadedAt,
        });
      }
    }

    // Update application with documents and change status to PENDING
    application.documents = documents;
    application.status = ApplicationStatus.PENDING;
    application.documentsVerified = false; // Admin needs to verify
    await application.save();

    // Send email notification to user
    const user = application.user as any;
    try {
      await mailService.sendOrganizerApplicationSubmitted({
        to: user.email,
        name: user.name,
        organizationName: application.organizationName,
      });
    } catch (emailError) {
      console.error("Failed to send application submitted email:", emailError);
      // Don't fail the request if email fails
    }

    return application;
  }

  // Get user's draft application (for resuming Form 2)
  async getDraftApplication(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    return OrganizerApplication.findOne({
      user: userId,
      status: ApplicationStatus.DRAFT,
    }).lean();
  }
  // Get user's applications
  async getUserApplications(userId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    return OrganizerApplication.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get all applications (admin only)
  async getAllApplications(filters: ApplicationFilters = {}) {
    const query: any = {};

    // Filter by status
    if (
      filters.status &&
      Object.values(ApplicationStatus).includes(filters.status)
    ) {
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
      throw new ApiError(
        "Invalid application ID",
        400,
        "INVALID_APPLICATION_ID",
      );
    }

    const application = await OrganizerApplication.findById(applicationId)
      .populate("user", "name email phoneNumber image")
      .populate("reviewedBy", "name email")
      .lean();

    if (!application) {
      throw new ApiError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    return application;
  }

  // Approve application (admin only)
  async approveApplication(
    applicationId: string,
    adminId: string,
    adminNotes?: string,
  ) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new ApiError(
        "Invalid application ID",
        400,
        "INVALID_APPLICATION_ID",
      );
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    const application = await OrganizerApplication.findById(
      applicationId,
    ).populate("user", "name email");

    if (!application) {
      throw new ApiError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new ApiError(
        "Only pending applications can be approved",
        400,
        "INVALID_APPLICATION_STATUS",
      );
    }

    // Get the user ID from populated document or ObjectId
    const populatedUser = application.user as any;
    const userId = populatedUser._id
      ? populatedUser._id.toString()
      : application.user.toString();

    const user = await User.findById(userId).select("name email");

    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    try {
      // Update application status
      application.status = ApplicationStatus.APPROVED;
      application.reviewedBy = new mongoose.Types.ObjectId(adminId);
      application.reviewedAt = new Date();
      application.documentsVerified = true;
      if (adminNotes) {
        application.adminNotes = adminNotes.trim();
      }
      await application.save();

      // Update user role and approval status
      await User.findByIdAndUpdate(userId, {
        role: Role.ORGANIZER,
        isOrganizerApproved: true,
      });

      // Send approval email to user
      try {
        await mailService.sendOrganizerApplicationApproved({
          to: user.email,
          name: user.name,
          organizationName: application.organizationName,
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the request if email fails
      }

      return application;
    } catch (error) {
      console.error("Error approving application:", error);
      throw new ApiError(
        "Failed to approve application",
        500,
        "APPROVAL_FAILED",
      );
    }
  }

  // Reject application (admin only)
  async rejectApplication(
    applicationId: string,
    adminId: string,
    rejectionReason?: string,
    adminNotes?: string,
  ) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new ApiError(
        "Invalid application ID",
        400,
        "INVALID_APPLICATION_ID",
      );
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    if (!rejectionReason || rejectionReason.trim().length < 10) {
      throw new ApiError(
        "Rejection reason must be at least 10 characters",
        400,
        "REJECTION_REASON_REQUIRED",
      );
    }

    const application = await OrganizerApplication.findById(
      applicationId,
    ).populate("user", "name email");

    if (!application) {
      throw new ApiError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new ApiError(
        "Only pending applications can be rejected",
        400,
        "INVALID_APPLICATION_STATUS",
      );
    }

    const user = application.user as any;
    const userEmail = user.email;
    const userName = user.name;
    const organizationName = application.organizationName;

    // Update application with rejection details before deletion
    application.status = ApplicationStatus.REJECTED;
    application.reviewedBy = new mongoose.Types.ObjectId(adminId);
    application.reviewedAt = new Date();
    application.rejectionReason = rejectionReason.trim();
    if (adminNotes) {
      application.adminNotes = adminNotes.trim();
    }
    await application.save();

    // Send rejection email before deleting
    let emailSent = false;
    try {
      await mailService.sendOrganizerApplicationRejected({
        to: userEmail,
        name: userName,
        organizationName: organizationName,
        rejectionReason: rejectionReason.trim(),
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
      // Continue with deletion even if email fails
    }

    // Delete the rejected application from database
    await OrganizerApplication.findByIdAndDelete(applicationId);

    return {
      message: "Application rejected and removed from database",
      rejectionReason: rejectionReason.trim(),
      userNotified: emailSent,
    };
  }

  // Revoke organizer privileges (admin only)
  async revokeOrganizer(
    organizerId: string,
    adminId: string,
    revocationReason: string,
  ) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      throw new ApiError("Invalid organizer ID", 400, "INVALID_ORGANIZER_ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    // Validate reason
    if (!revocationReason || revocationReason.trim().length < 10) {
      throw new ApiError(
        "Revocation reason must be at least 10 characters",
        400,
        "VALIDATION_ERROR",
      );
    }

    const user = await User.findById(organizerId);

    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== Role.ORGANIZER) {
      throw new ApiError("User is not an organizer", 400, "USER_NOT_ORGANIZER");
    }

    if (user.isOrganizerRevoked) {
      throw new ApiError(
        "Organizer is already revoked",
        400,
        "ORGANIZER_ALREADY_REVOKED",
      );
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
          $set: { closedReason: "Organizer account revoked" },
        },
        { session },
      );

      // Reject all pending withdrawal requests
      await WithdrawalRequest.updateMany(
        { organizer: organizerId, status: WithdrawalStatus.REQUESTED },
        {
          status: WithdrawalStatus.REJECTED,
          adminMessage: "Organizer account has been revoked",
          reviewedBy: adminId,
        },
        { session },
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
      throw new ApiError("Invalid organizer ID", 400, "INVALID_ORGANIZER_ID");
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError("Invalid admin ID", 400, "INVALID_ADMIN_ID");
    }

    const user = await User.findById(organizerId);

    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.role !== Role.ORGANIZER) {
      throw new ApiError("User is not an organizer", 400, "USER_NOT_ORGANIZER");
    }

    if (!user.isOrganizerRevoked) {
      throw new ApiError(
        "Organizer is not revoked",
        400,
        "ORGANIZER_NOT_REVOKED",
      );
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
  async getAllOrganizers(
    filters: { status?: string; page?: number; limit?: number } = {},
  ) {
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
