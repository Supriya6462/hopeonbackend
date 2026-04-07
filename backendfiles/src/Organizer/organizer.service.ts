import { OrganizerApplication } from "../models/OrganizerApplication.model.js";
import OrganizerProfile from "../models/OrganizerProfile.model.js";
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
import path from "node:path";
import { uploadLocalFile } from "../utils/localUpload.util.js";
import { ApiError } from "../utils/ApiError.js";
import { mailService } from "../mail/mail.service.js";
import {
  createInAppNotification,
  NotificationEventType,
} from "../services/notification.service.js";

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

interface OrganizerProfileUpsertDTO {
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    accountType: "savings" | "checking" | "business";
    bankAddress?: string;
    bankCountry: string;
  };
  documents: {
    governmentId?: Record<string, unknown>;
    bankProof?: Record<string, unknown>;
    addressProof?: Record<string, unknown>;
    taxDocument?: Record<string, unknown>;
  };
  kycInfo: Record<string, unknown>;
}

interface OrganizerProfileFilters {
  status?: "pending" | "verified" | "rejected";
  search?: string;
  page?: number;
  limit?: number;
}

export class OrganizerService {
  private async resolveUploadedDocument(
    file: Express.Multer.File,
    fallbackFolder: string,
  ): Promise<{ url: string; key: string; uploadedAt: Date }> {
    const fileWithMeta = file as Express.Multer.File & {
      location?: string;
      key?: string;
    };

    if (fileWithMeta.location && fileWithMeta.key) {
      return {
        url: fileWithMeta.location,
        key: fileWithMeta.key,
        uploadedAt: new Date(),
      };
    }

    if (file.path) {
      const uploadDirName = process.env.UPLOAD_DIR || "uploads";
      const uploadBasePath = path.resolve(process.cwd(), uploadDirName);
      const backendBaseUrl =
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 3001}`;

      const relativeFilePath = path.relative(uploadBasePath, file.path);
      const safeRelativeFilePath =
        relativeFilePath && !relativeFilePath.startsWith("..")
          ? relativeFilePath
          : path.join("documents", file.filename || file.originalname);
      const normalizedPath = safeRelativeFilePath.split(path.sep).join("/");

      return {
        url: `${backendBaseUrl}/${uploadDirName}/${normalizedPath}`,
        key: normalizedPath,
        uploadedAt: new Date(),
      };
    }

    if (file.buffer) {
      const result = await uploadLocalFile(
        file.buffer,
        fallbackFolder,
        file.originalname,
        file.mimetype,
      );
      return {
        url: result.url,
        key: result.key,
        uploadedAt: result.uploadedAt,
      };
    }

    throw new ApiError(
      "Uploaded file payload is invalid",
      400,
      "INVALID_UPLOADED_FILE",
    );
  }

  private pushStatusHistory(
    application: any,
    {
      toStatus,
      changedBy,
      reason = null,
    }: {
      toStatus: ApplicationStatus;
      changedBy: string;
      reason?: string | null;
    },
  ) {
    application.statusHistory = application.statusHistory || [];
    application.statusHistory.push({
      fromStatus: application.status ?? null,
      toStatus,
      changedBy: new mongoose.Types.ObjectId(changedBy),
      reason,
      changedAt: new Date(),
    });
  }

  private buildReusableDocumentsFromApplication(application: any) {
    if (!application?.documents) {
      return {
        governmentId: null,
        addressProof: null,
        taxDocument: null,
      };
    }

    return {
      governmentId: application.documents.governmentId?.url
        ? {
            url: application.documents.governmentId.url,
            key: application.documents.governmentId.publicId,
            type: "national_id",
            source: "organizer_application",
          }
        : null,
      addressProof: application.documents.addressProof?.url
        ? {
            url: application.documents.addressProof.url,
            key: application.documents.addressProof.publicId,
            type: "government_letter",
            source: "organizer_application",
          }
        : null,
      taxDocument: application.documents.taxId?.url
        ? {
            url: application.documents.taxId.url,
            key: application.documents.taxId.publicId,
            type: "tax_id",
            source: "organizer_application",
          }
        : null,
    };
  }

  private mergeOrganizerDocumentsWithDefaults(
    inputDocuments: any,
    defaults: any,
  ) {
    return {
      governmentId: inputDocuments?.governmentId?.url
        ? inputDocuments.governmentId
        : defaults.governmentId,
      bankProof: inputDocuments?.bankProof,
      addressProof: inputDocuments?.addressProof?.url
        ? inputDocuments.addressProof
        : defaults.addressProof,
      taxDocument: inputDocuments?.taxDocument?.url
        ? inputDocuments.taxDocument
        : defaults.taxDocument,
    };
  }

  private async notifyAdminsAboutOrganizerApplication(application: any) {
    const admins = await User.find({ role: Role.ADMIN }).select("_id");
    if (!admins.length) {
      return;
    }

    await Promise.all(
      admins.map((admin) =>
        createInAppNotification({
          recipient: admin._id,
          eventType: NotificationEventType.ORGANIZER_APPLICATION_PENDING_REVIEW,
          title: "New Organizer Application",
          message: "A donor submitted an organizer application for review.",
          payload: {
            applicationId: application._id,
            userId: application.user,
            organizationName: application.organizationName,
            status: application.status,
          },
        }),
      ),
    );
  }

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
      statusHistory: [
        {
          fromStatus: null,
          toStatus: ApplicationStatus.PENDING,
          changedBy: new mongoose.Types.ObjectId(userId),
        },
      ],
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
      statusHistory: [
        {
          fromStatus: null,
          toStatus: ApplicationStatus.DRAFT,
          changedBy: new mongoose.Types.ObjectId(userId),
        },
      ],
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

    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.PENDING
    ) {
      throw new ApiError(
        "Can only upload documents to draft or pending applications",
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
        const result = await this.resolveUploadedDocument(
          file,
          `${uploadFolder}/${field}`,
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
        const result = await this.resolveUploadedDocument(
          file,
          `${uploadFolder}/additional`,
        );
        documents.additionalDocuments.push({
          name: file.originalname,
          url: result.url,
          publicId: result.key,
          uploadedAt: result.uploadedAt,
        });
      }
    }

    // Update application with documents and keep status transition idempotent.
    application.documents = documents;
    if (application.status !== ApplicationStatus.PENDING) {
      this.pushStatusHistory(application, {
        toStatus: ApplicationStatus.PENDING,
        changedBy: userId,
      });
    }
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

    try {
      await createInAppNotification({
        recipient: userId,
        eventType: NotificationEventType.ORGANIZER_APPLICATION_SUBMITTED,
        title: "Application Submitted",
        message:
          "Your organizer application is pending admin review. We will notify you once it is reviewed.",
        payload: {
          applicationId: application._id,
          status: application.status,
        },
      });

      await this.notifyAdminsAboutOrganizerApplication(application);
    } catch (notifyError) {
      console.error(
        "Failed to create organizer application notifications:",
        notifyError,
      );
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

  async getOrganizerApplicationStatus(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400, "INVALID_USER_ID");
    }

    const user = await User.findById(userId).select("role isOrganizerApproved");
    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    const latestApp = await OrganizerApplication.findOne({ user: userId }).sort(
      {
        createdAt: -1,
      },
    );

    if (!latestApp) {
      return {
        hasApplication: false,
        canResubmit: false,
        application: null,
        currentUserRole: user.role,
        isOrganizerApproved: user.isOrganizerApproved,
      };
    }

    return {
      hasApplication: true,
      canResubmit: [
        ApplicationStatus.REJECTED,
        ApplicationStatus.REVOKED,
      ].includes(latestApp.status),
      application: latestApp,
      currentUserRole: user.role,
      isOrganizerApproved: user.isOrganizerApproved,
    };
  }

  async getUserApplicationById(userId: string, applicationId: string) {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      throw new ApiError(
        "Invalid application ID",
        400,
        "INVALID_APPLICATION_ID",
      );
    }

    const application = await OrganizerApplication.findById(applicationId);
    if (!application) {
      throw new ApiError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    if (application.user.toString() !== userId) {
      throw new ApiError("Forbidden", 403, "FORBIDDEN");
    }

    return application;
  }

  async resubmitApplication(
    userId: string,
    applicationId: string,
    applicationData: SubmitApplicationDTO,
  ) {
    const application = await this.getUserApplicationById(
      userId,
      applicationId,
    );

    if (
      ![ApplicationStatus.REJECTED, ApplicationStatus.REVOKED].includes(
        application.status,
      )
    ) {
      throw new ApiError(
        "Only rejected or revoked applications can be resubmitted",
        400,
        "INVALID_APPLICATION_STATUS",
      );
    }

    const currentlyPending = await OrganizerApplication.findOne({
      user: userId,
      status: ApplicationStatus.PENDING,
      _id: { $ne: application._id },
    });

    if (currentlyPending) {
      throw new ApiError(
        "You already have a pending organizer application",
        409,
        "APPLICATION_EXISTS",
      );
    }

    this.pushStatusHistory(application, {
      toStatus: ApplicationStatus.DRAFT,
      changedBy: userId,
      reason: "Organizer resubmitted application after review.",
    });

    application.organizationName = applicationData.organizationName.trim();
    application.description = applicationData.description.trim();
    application.contactEmail = applicationData.contactEmail?.trim() || "";
    application.phoneNumber = applicationData.phoneNumber?.trim() || "";
    application.website = applicationData.website?.trim() || "";
    application.organizationType =
      applicationData.organizationType || OrganizationType.OTHER;
    application.status = ApplicationStatus.DRAFT;
    application.reviewedBy = null as any;
    application.reviewedAt = null as any;
    application.rejectionReason = null as any;
    application.adminNotes = null as any;
    application.documentsVerified = false;

    await application.save();

    return application;
  }

  async getOrganizerProfile(userId: string) {
    const approvedApplication = await OrganizerApplication.findOne({
      user: userId,
      status: ApplicationStatus.APPROVED,
    })
      .sort({ reviewedAt: -1, updatedAt: -1 })
      .select("documents")
      .lean();

    const documentDefaults =
      this.buildReusableDocumentsFromApplication(approvedApplication);

    const profile = await OrganizerProfile.findOne({ organizer: userId });

    if (!profile) {
      return {
        hasProfile: false,
        verificationStatus: null,
        profile: null,
        documentDefaults,
        documentReuseSummary: {
          reusableDocumentsCount:
            Object.values(documentDefaults).filter(Boolean).length,
          requiresBankProofUpload: true,
        },
      };
    }

    return {
      hasProfile: true,
      verificationStatus: profile.verificationStatus,
      profile: {
        ...profile.toObject(),
        bankDetails:
          typeof (profile as any).getMaskedBankDetails === "function"
            ? (profile as any).getMaskedBankDetails()
            : profile.bankDetails,
      },
      documentDefaults,
      documentReuseSummary: {
        reusableDocumentsCount:
          Object.values(documentDefaults).filter(Boolean).length,
        requiresBankProofUpload: true,
      },
    };
  }

  async upsertOrganizerProfile(
    userId: string,
    payload: OrganizerProfileUpsertDTO,
  ) {
    const approvedApplication = await OrganizerApplication.findOne({
      user: userId,
      status: ApplicationStatus.APPROVED,
    })
      .sort({ reviewedAt: -1, updatedAt: -1 })
      .select("documents")
      .lean();

    const reusableDefaults =
      this.buildReusableDocumentsFromApplication(approvedApplication);
    const mergedDocuments = this.mergeOrganizerDocumentsWithDefaults(
      payload.documents,
      reusableDefaults,
    );

    if (
      !mergedDocuments.governmentId?.url ||
      !mergedDocuments.bankProof?.url ||
      !mergedDocuments.addressProof?.url
    ) {
      throw new ApiError(
        "All required documents must be available (Government ID, Bank Proof, Address Proof). Government ID and Address Proof can be reused from your approved organizer application.",
        400,
        "MISSING_REQUIRED_DOCUMENTS",
      );
    }

    const existingProfile = await OrganizerProfile.findOne({
      organizer: userId,
    });
    if (existingProfile && existingProfile.verificationStatus === "verified") {
      throw new ApiError(
        "Your organizer profile is already verified and locked.",
        409,
        "PROFILE_LOCKED",
      );
    }

    const profile =
      existingProfile ||
      new OrganizerProfile({
        organizer: userId,
      });

    profile.bankDetails = payload.bankDetails as any;
    profile.documents = mergedDocuments as any;
    profile.kycInfo = payload.kycInfo as any;
    profile.verificationStatus = "pending";
    profile.verifiedBy = null as any;
    profile.verifiedAt = null as any;
    profile.rejectionReason = undefined as any;

    await profile.save();

    try {
      const admins = await User.find({ role: Role.ADMIN }).select("_id");
      if (admins.length) {
        await Promise.all(
          admins.map((admin) =>
            createInAppNotification({
              recipient: admin._id,
              eventType: NotificationEventType.ORGANIZER_PROFILE_PENDING_REVIEW,
              title: "Organizer Profile Verification Required",
              message: `An organizer profile needs verification for ${
                (payload.kycInfo?.fullLegalName as string) || "an organizer"
              }.`,
              payload: {
                organizerProfileId: profile._id,
                organizerId: profile.organizer,
                verificationStatus: "pending",
              },
            }),
          ),
        );
      }
    } catch (notifyError) {
      console.error(
        "Failed to create admin notification for organizer profile submission:",
        notifyError,
      );
    }

    return {
      profile,
      created: !existingProfile,
    };
  }

  async listOrganizerProfiles(filters: OrganizerProfileFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const status = filters.status;
    const search = (filters.search || "").trim();

    const match = {
      ...(status ? { verificationStatus: status } : {}),
    };

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "organizer",
          foreignField: "_id",
          as: "organizerUser",
        },
      },
      {
        $unwind: {
          path: "$organizerUser",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "organizerUser.name": { $regex: search, $options: "i" } },
            { "organizerUser.email": { $regex: search, $options: "i" } },
            { "kycInfo.fullLegalName": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          organizer: 1,
          verificationStatus: 1,
          verifiedBy: 1,
          verifiedAt: 1,
          rejectionReason: 1,
          kycInfo: 1,
          documents: 1,
          bankDetails: {
            accountHolderName: "$bankDetails.accountHolderName",
            bankName: "$bankDetails.bankName",
            bankCountry: "$bankDetails.bankCountry",
            accountType: "$bankDetails.accountType",
            accountNumberLast4: "$bankDetails.accountNumberLast4",
          },
          createdAt: 1,
          updatedAt: 1,
          organizerUser: {
            _id: "$organizerUser._id",
            name: "$organizerUser.name",
            email: "$organizerUser.email",
          },
        },
      },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $count: "total" }],
        },
      },
    );

    const [result] = await OrganizerProfile.aggregate(pipeline);
    const items = result?.items || [];
    const total = result?.meta?.[0]?.total || 0;

    return {
      organizerProfiles: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async verifyOrganizerProfile(
    profileId: string,
    adminUserId: string,
    verificationStatus: "verified" | "rejected",
    rejectionReason?: string,
  ) {
    const profile = await OrganizerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(
        "Organizer profile not found",
        404,
        "PROFILE_NOT_FOUND",
      );
    }

    profile.verificationStatus = verificationStatus;
    profile.verifiedBy = new mongoose.Types.ObjectId(adminUserId);
    profile.verifiedAt = new Date();
    profile.rejectionReason =
      verificationStatus === "rejected"
        ? rejectionReason?.trim() || "Profile verification was rejected."
        : (undefined as any);

    await profile.save();

    await createInAppNotification({
      recipient: profile.organizer,
      eventType:
        verificationStatus === "verified"
          ? NotificationEventType.ORGANIZER_PROFILE_VERIFIED
          : NotificationEventType.ORGANIZER_PROFILE_REJECTED,
      title:
        verificationStatus === "verified"
          ? "Organizer Profile Verified"
          : "Organizer Profile Rejected",
      message:
        verificationStatus === "verified"
          ? "Your organizer profile is verified. You can now submit withdrawal requests."
          : "Your organizer profile was rejected. Review feedback and resubmit.",
      payload: {
        organizerProfileId: profile._id,
        verificationStatus,
        rejectionReason: profile.rejectionReason,
      },
    });

    return profile;
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
      this.pushStatusHistory(application, {
        toStatus: ApplicationStatus.APPROVED,
        changedBy: adminId,
        reason: adminNotes?.trim() || null,
      });
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

      try {
        await createInAppNotification({
          recipient: userId,
          eventType: NotificationEventType.ORGANIZER_APPLICATION_APPROVED,
          title: "Organizer Application Approved",
          message: "Your organizer application was approved.",
          payload: {
            applicationId: application._id,
            organizationName: application.organizationName,
            status: ApplicationStatus.APPROVED,
          },
        });
      } catch (notifyError) {
        console.error(
          "Failed to create organizer approval notification:",
          notifyError,
        );
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

    // Update application with rejection details and retain record for resubmission/history.
    application.status = ApplicationStatus.REJECTED;
    application.reviewedBy = new mongoose.Types.ObjectId(adminId);
    application.reviewedAt = new Date();
    application.rejectionReason = rejectionReason.trim();
    if (adminNotes) {
      application.adminNotes = adminNotes.trim();
    }
    this.pushStatusHistory(application, {
      toStatus: ApplicationStatus.REJECTED,
      changedBy: adminId,
      reason: rejectionReason.trim(),
    });
    await application.save();

    // Send rejection email after status update.
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
      // Continue even if email fails.
    }

    try {
      await createInAppNotification({
        recipient: user._id,
        eventType: NotificationEventType.ORGANIZER_APPLICATION_REJECTED,
        title: "Organizer Application Rejected",
        message:
          "Your organizer application was rejected. You can update and resubmit it.",
        payload: {
          applicationId: application._id,
          organizationName: application.organizationName,
          rejectionReason: rejectionReason.trim(),
          status: ApplicationStatus.REJECTED,
        },
      });
    } catch (notifyError) {
      console.error(
        "Failed to create organizer rejection notification:",
        notifyError,
      );
    }

    return {
      message: "Application rejected successfully",
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
        { owner: organizerId, status: { $ne: "expired" } },
        {
          status: "expired",
          endedAt: new Date(),
          isDonationEnabled: false,
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

      // Mark approved organizer application as revoked for audit history.
      await OrganizerApplication.updateMany(
        { user: organizerId, status: ApplicationStatus.APPROVED },
        {
          status: ApplicationStatus.REVOKED,
          reviewedBy: new mongoose.Types.ObjectId(adminId),
          reviewedAt: new Date(),
          $push: {
            statusHistory: {
              fromStatus: ApplicationStatus.APPROVED,
              toStatus: ApplicationStatus.REVOKED,
              changedBy: new mongoose.Types.ObjectId(adminId),
              reason: revocationReason.trim(),
              changedAt: new Date(),
            },
          },
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
