import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import OrganizerApplication from "../Models/OrganizerApplication.js";
import OrganizerProfile from "../Models/OrganizerProfile.js";
import ActivityLog from "../Models/ActivityLog.js";
import User from "../Models/User.js";
import {
  applyFileMetadataForResponse,
  handleDocumentUploadError,
  uploadMultipleDocuments,
  uploadSingleDocument,
} from "../config/localDocumentUpload.js";
import { sendApplicationSubmittedEmail } from "../services/emailService.js";
import { createInAppNotification } from "../services/notificationService.js";
import {
  approveAdminApplication,
  listAdminApplications,
  rejectAdminApplication,
  revokeAdminApplication,
} from "../controllers/adminApplicationsController.js";

const router = Router();

function singleDocumentUploadMiddleware(req, res, next) {
  uploadSingleDocument.single("document")(req, res, (error) => {
    if (error) {
      return handleDocumentUploadError(error, res);
    }

    applyFileMetadataForResponse(req);
    return next();
  });
}

function organizerDocumentsUploadMiddleware(req, res, next) {
  uploadMultipleDocuments.fields([
    { name: "governmentId", maxCount: 1 },
    { name: "selfieWithId", maxCount: 1 },
    { name: "registrationCertificate", maxCount: 1 },
    { name: "taxId", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "additionalDocuments", maxCount: 5 },
  ])(req, res, (error) => {
    if (error) {
      return handleDocumentUploadError(error, res);
    }

    applyFileMetadataForResponse(req);
    return next();
  });
}

function buildReusableDocumentsFromApplication(application) {
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
          key: application.documents.governmentId.key,
          type: "national_id",
          source: "organizer_application",
        }
      : null,
    addressProof: application.documents.addressProof?.url
      ? {
          url: application.documents.addressProof.url,
          key: application.documents.addressProof.key,
          type: "government_letter",
          source: "organizer_application",
        }
      : null,
    taxDocument: application.documents.taxId?.url
      ? {
          url: application.documents.taxId.url,
          key: application.documents.taxId.key,
          type: "tax_id",
          source: "organizer_application",
        }
      : null,
  };
}

function mergeOrganizerDocumentsWithDefaults(inputDocuments, defaults) {
  const merged = {
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

  return merged;
}

function pushStatusHistory(
  application,
  { toStatus, changedBy, reason = null },
) {
  application.statusHistory = application.statusHistory || [];
  application.statusHistory.push({
    fromStatus: application.status ?? null,
    toStatus,
    changedBy,
    reason,
    changedAt: new Date(),
  });
}

async function notifyAdminsAboutOrganizerApplication(application) {
  const admins = await User.find({ role: "admin" }).select("_id");
  if (!admins.length) {
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      createInAppNotification({
        recipient: admin._id,
        eventType: "organizer_application_pending_review",
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

/**
 * GET /api/organizer/profile
 *   • Organizer fetches one-time KYC/bank profile used for withdrawals.
 */
router.get(
  "/organizer/profile",
  requireAuth,
  requireRole("organizer"),
  async (req, res) => {
    try {
      const approvedApplication = await OrganizerApplication.findOne({
        user: req.user.userId,
        status: "approved",
      })
        .sort({ reviewedAt: -1, updatedAt: -1 })
        .select("documents");
      const documentDefaults =
        buildReusableDocumentsFromApplication(approvedApplication);

      const profile = await OrganizerProfile.findOne({
        organizer: req.user.userId,
      });

      if (!profile) {
        return res.json({
          hasProfile: false,
          verificationStatus: null,
          profile: null,
          documentDefaults,
          documentReuseSummary: {
            reusableDocumentsCount:
              Object.values(documentDefaults).filter(Boolean).length,
            requiresBankProofUpload: true,
          },
        });
      }

      return res.json({
        hasProfile: true,
        verificationStatus: profile.verificationStatus,
        profile: {
          ...profile.toObject(),
          bankDetails: profile.getMaskedBankDetails(),
        },
        documentDefaults,
        documentReuseSummary: {
          reusableDocumentsCount:
            Object.values(documentDefaults).filter(Boolean).length,
          requiresBankProofUpload: true,
        },
      });
    } catch (err) {
      console.error("Organizer Profile Fetch Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * POST /api/organizer/profile/upload-document
 *   • Upload a KYC document for organizer profile setup.
 */
router.post(
  "/organizer/profile/upload-document",
  requireAuth,
  requireRole("organizer"),
  singleDocumentUploadMiddleware,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      return res.json({
        message: "Document uploaded successfully",
        url: req.file.location,
        key: req.file.key,
        documentType: req.body.documentType,
      });
    } catch (err) {
      console.error("Organizer Profile Document Upload Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * POST /api/organizer/profile
 *   • Create/update organizer profile. Re-submission sets status back to pending.
 */
router.post(
  "/organizer/profile",
  requireAuth,
  requireRole("organizer"),
  async (req, res) => {
    try {
      const { bankDetails, documents, kycInfo } = req.body;

      if (!bankDetails || !documents || !kycInfo) {
        return res.status(400).json({
          message: "bankDetails, documents, and kycInfo are required.",
        });
      }

      const approvedApplication = await OrganizerApplication.findOne({
        user: req.user.userId,
        status: "approved",
      })
        .sort({ reviewedAt: -1, updatedAt: -1 })
        .select("documents");
      const reusableDefaults =
        buildReusableDocumentsFromApplication(approvedApplication);
      const mergedDocuments = mergeOrganizerDocumentsWithDefaults(
        documents,
        reusableDefaults,
      );

      if (
        !mergedDocuments.governmentId?.url ||
        !mergedDocuments.bankProof?.url ||
        !mergedDocuments.addressProof?.url
      ) {
        return res.status(400).json({
          message:
            "All required documents must be available (Government ID, Bank Proof, Address Proof). Government ID and Address Proof can be reused from your approved organizer application.",
        });
      }

      const existingProfile = await OrganizerProfile.findOne({
        organizer: req.user.userId,
      });

      if (
        existingProfile &&
        existingProfile.verificationStatus === "verified"
      ) {
        return res.status(409).json({
          message: "Your organizer profile is already verified and locked.",
        });
      }

      const profile =
        existingProfile ||
        new OrganizerProfile({
          organizer: req.user.userId,
        });

      profile.bankDetails = bankDetails;
      profile.documents = mergedDocuments;
      profile.kycInfo = kycInfo;
      profile.verificationStatus = "pending";
      profile.verifiedBy = null;
      profile.verifiedAt = null;
      profile.rejectionReason = null;

      await profile.save();

      await ActivityLog.create({
        user: req.user.userId,
        activityType: "profile_updated",
        description: "Organizer profile submitted for verification",
        metadata: {
          organizerProfileId: profile._id,
          verificationStatus: profile.verificationStatus,
        },
      });

      // Notify all admins about the new organizer profile verification request
      try {
        const User = (await import("../Models/User.js")).default;
        const admins = await User.find({ role: "admin" }).select("_id");
        if (admins.length) {
          await Promise.all(
            admins.map((admin) =>
              createInAppNotification({
                recipient: admin._id,
                eventType: "organizer_profile_pending_review",
                title: "Organizer Profile Verification Required",
                message: `An organizer profile needs verification for ${kycInfo.fullLegalName || "an organizer"}.`,
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

      return res.status(existingProfile ? 200 : 201).json({
        message: existingProfile
          ? "Organizer profile updated and submitted for verification."
          : "Organizer profile created and submitted for verification.",
        verificationStatus: profile.verificationStatus,
      });
    } catch (err) {
      console.error("Organizer Profile Upsert Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * PATCH /api/admin/organizer-profiles/:id/verify
 *   • Admin verifies or rejects organizer profile.
 */
router.patch(
  "/admin/organizer-profiles/:id/verify",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { verificationStatus, rejectionReason } = req.body;

      if (!["verified", "rejected"].includes(verificationStatus)) {
        return res.status(400).json({
          message: "verificationStatus must be verified or rejected.",
        });
      }

      const profile = await OrganizerProfile.findById(id);
      if (!profile) {
        return res
          .status(404)
          .json({ message: "Organizer profile not found." });
      }

      profile.verificationStatus = verificationStatus;
      profile.verifiedBy = req.user.userId;
      profile.verifiedAt = new Date();
      profile.rejectionReason =
        verificationStatus === "rejected"
          ? rejectionReason?.trim() || "Profile verification was rejected."
          : null;

      await profile.save();

      await ActivityLog.create({
        user: req.user.userId,
        activityType: "profile_updated",
        description: `Organizer profile ${verificationStatus}`,
        metadata: {
          organizerProfileId: profile._id,
          organizerId: profile.organizer,
          verificationStatus,
          rejectionReason: profile.rejectionReason,
        },
        relatedEntity: {
          entityType: "OrganizerProfile",
          entityId: profile._id,
        },
      });

      await createInAppNotification({
        recipient: profile.organizer,
        eventType: `organizer_profile_${verificationStatus}`,
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

      // Notify admins when profile is submitted for verification (initial submission)
      if (verificationStatus === "pending_review") {
        try {
          const User = (await import("../Models/User.js")).default;
          const admins = await User.find({ role: "admin" }).select("_id");
          if (admins.length) {
            await Promise.all(
              admins.map((admin) =>
                createInAppNotification({
                  recipient: admin._id,
                  eventType: "organizer_profile_pending_review",
                  title: "Organizer Profile Verification Required",
                  message: `An organizer profile needs verification for ${profile.kycInfo?.fullLegalName || "an organizer"}.`,
                  payload: {
                    organizerProfileId: profile._id,
                    organizerId: profile.organizer,
                    verificationStatus: "pending_review",
                  },
                }),
              ),
            );
          }
        } catch (notifyError) {
          console.error(
            "Failed to create admin notification for organizer profile verification:",
            notifyError,
          );
        }
      }

      return res.json({
        message:
          verificationStatus === "verified"
            ? "Organizer profile verified."
            : "Organizer profile rejected.",
      });
    } catch (err) {
      console.error("Organizer Profile Verify Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * GET /api/admin/organizer-profiles
 *   • Admin fetches organizer profiles for KYC verification queue.
 */
router.get(
  "/admin/organizer-profiles",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit || "20", 10)),
      );
      const status = req.query.status;
      const search = (req.query.search || "").trim();

      const allowedStatuses = ["pending", "verified", "rejected"];
      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter." });
      }

      const match = {
        ...(status ? { verificationStatus: status } : {}),
      };

      const pipeline = [
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

      return res.json({
        organizerProfiles: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("Admin Organizer Profile List Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * GET /api/organizer/application-status
 *   • Donor checks latest organizer application status.
 *   • Useful for polling on frontend while pending.
 */
router.get("/organizer/application-status", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "role isOrganizerApproved",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const latestApp = await OrganizerApplication.findOne({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    if (!latestApp) {
      return res.json({
        hasApplication: false,
        canResubmit: false,
        application: null,
        currentUserRole: user.role,
        isOrganizerApproved: user.isOrganizerApproved,
      });
    }

    const canResubmit = ["rejected", "revoked"].includes(latestApp.status);

    return res.json({
      hasApplication: true,
      canResubmit,
      application: latestApp,
      currentUserRole: user.role,
      isOrganizerApproved: user.isOrganizerApproved,
    });
  } catch (err) {
    console.error("Application Status Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/organizer/applications/:applicationId
 *   • Donor fetches own application details (used for resubmission UX).
 */
router.get(
  "/organizer/applications/:applicationId",
  requireAuth,
  requireRole("donor"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;

      const application = await OrganizerApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found." });
      }

      if (application.user.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden." });
      }

      return res.json({ application });
    } catch (err) {
      console.error("Get Organizer Application Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * POST /api/organizer/apply
 *   • Only a logged‐in donor can create a new application.
 *   • If they already have a pending or approved application, reject.
 */
router.post(
  "/organizer/apply",
  requireAuth,
  requireRole("donor"),
  async (req, res) => {
    try {
      const {
        organizationName,
        description,
        contactEmail,
        phoneNumber,
        website,
        organizationType,
      } = req.body;
      const userId = req.user.userId;

      // 1) Validate required fields
      if (!organizationName || !description) {
        return res
          .status(400)
          .json({ message: "Organization name and description are required." });
      }

      // 2) Check if user already has a pending, draft, or approved application
      const existing = await OrganizerApplication.findOne({
        user: userId,
        status: { $in: ["draft", "pending", "approved"] },
      }).sort({ createdAt: -1 });
      if (existing) {
        // If they have a draft, allow them to continue with that one
        if (existing.status === "draft") {
          return res.status(200).json({
            message:
              "You have an incomplete application. Redirecting to document upload.",
            applicationId: existing._id,
            app: existing,
          });
        }
        // Otherwise, they already have a pending or approved application
        return res.status(409).json({
          message:
            "You already have a pending or approved application. You cannot apply again.",
        });
      }

      // 3) Create new application as DRAFT (not visible to admin yet)
      const app = await OrganizerApplication.create({
        user: userId,
        organizationName: organizationName.trim(),
        description: description.trim(),
        contactEmail: contactEmail?.trim(),
        phoneNumber: phoneNumber?.trim(),
        website: website?.trim(),
        organizationType: organizationType || "other",
        status: "draft", // ← Changed from "pending" to "draft"
        statusHistory: [
          {
            fromStatus: null,
            toStatus: "draft",
            changedBy: userId,
            reason: null,
            changedAt: new Date(),
          },
        ],
      });

      return res.status(201).json({
        message: "Application submitted. Please upload verification documents.",
        applicationId: app._id,
        app,
      });
    } catch (err) {
      console.error("Apply Organizer Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * PATCH /api/organizer/applications/:applicationId/resubmit
 *   • Donor can resubmit a rejected/revoked application.
 *   • Resubmission moves status back to draft, then user uploads documents.
 */
router.patch(
  "/organizer/applications/:applicationId/resubmit",
  requireAuth,
  requireRole("donor"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.user.userId;
      const {
        organizationName,
        description,
        contactEmail,
        phoneNumber,
        website,
        organizationType,
      } = req.body;

      if (!organizationName || !description) {
        return res
          .status(400)
          .json({ message: "Organization name and description are required." });
      }

      const application = await OrganizerApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found." });
      }

      if (application.user.toString() !== userId) {
        return res.status(403).json({ message: "Forbidden." });
      }

      if (!["rejected", "revoked"].includes(application.status)) {
        return res.status(400).json({
          message: "Only rejected or revoked applications can be resubmitted.",
        });
      }

      const currentlyPending = await OrganizerApplication.findOne({
        user: userId,
        status: "pending",
        _id: { $ne: application._id },
      });
      if (currentlyPending) {
        return res.status(409).json({
          message: "You already have a pending organizer application.",
        });
      }

      pushStatusHistory(application, {
        toStatus: "draft",
        changedBy: userId,
        reason: "Organizer resubmitted application after review.",
      });

      application.organizationName = organizationName.trim();
      application.description = description.trim();
      application.contactEmail = contactEmail?.trim() || "";
      application.phoneNumber = phoneNumber?.trim() || "";
      application.website = website?.trim() || "";
      application.organizationType = organizationType || "other";
      application.status = "draft";
      application.reviewedBy = null;
      application.reviewedAt = null;
      application.rejectionReason = null;
      application.adminNotes = null;

      await application.save();

      return res.json({
        message:
          "Application moved to draft. Please upload documents to submit again.",
        applicationId: application._id,
        app: application,
      });
    } catch (err) {
      console.error("Resubmit Organizer Application Error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
);

/**
 * POST /api/organizer/upload-documents/:applicationId
 *   • Upload verification documents for an application
 *   • Accepts multiple files for different document types
 */
router.post(
  "/organizer/upload-documents/:applicationId",
  requireAuth,
  requireRole("donor"),
  organizerDocumentsUploadMiddleware,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.user.userId;

      // 1) Find the application
      const application = await OrganizerApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found." });
      }

      // 2) Verify ownership
      if (application.user.toString() !== userId) {
        return res.status(403).json({
          message: "You can only upload documents for your own application.",
        });
      }

      // 3) Verify application is in draft status (awaiting documents)
      if (application.status !== "draft" && application.status !== "pending") {
        return res.status(400).json({
          message:
            "Can only upload documents for draft or pending applications.",
        });
      }

      // 4) Process uploaded files
      const documents = {};
      const files = req.files || {};

      if (files.governmentId) {
        documents["documents.governmentId"] = {
          url: files.governmentId[0].location,
          key: files.governmentId[0].key,
          uploadedAt: new Date(),
        };
      }

      if (files.selfieWithId) {
        documents["documents.selfieWithId"] = {
          url: files.selfieWithId[0].location,
          key: files.selfieWithId[0].key,
          uploadedAt: new Date(),
        };
      }

      if (files.registrationCertificate) {
        documents["documents.registrationCertificate"] = {
          url: files.registrationCertificate[0].location,
          key: files.registrationCertificate[0].key,
          uploadedAt: new Date(),
        };
      }

      if (files.taxId) {
        documents["documents.taxId"] = {
          url: files.taxId[0].location,
          key: files.taxId[0].key,
          uploadedAt: new Date(),
        };
      }

      if (files.addressProof) {
        documents["documents.addressProof"] = {
          url: files.addressProof[0].location,
          key: files.addressProof[0].key,
          uploadedAt: new Date(),
        };
      }

      // Handle additional documents
      if (files.additionalDocuments) {
        const additionalDocs = files.additionalDocuments.map((file) => ({
          name: file.originalname,
          url: file.location,
          key: file.key,
          uploadedAt: new Date(),
        }));
        documents["documents.additionalDocuments"] = additionalDocs;
      }

      // 5) Update application with documents AND change status to "pending"
      // This makes it visible to admin for review
      for (const [key, value] of Object.entries(documents)) {
        application.set(key, value);
      }
      if (application.status !== "pending") {
        pushStatusHistory(application, {
          toStatus: "pending",
          changedBy: userId,
        });
      }
      application.status = "pending";
      await application.save();

      const updatedApplication = await OrganizerApplication.findById(
        applicationId,
      ).populate("user", "name email");

      // 6) Send email notification to user
      try {
        await sendApplicationSubmittedEmail(
          updatedApplication.user,
          updatedApplication,
        );
      } catch (emailError) {
        console.error(
          "Failed to send application submitted email:",
          emailError,
        );
        // Don't fail the request if email fails
      }

      await createInAppNotification({
        recipient: userId,
        eventType: "organizer_application_submitted",
        title: "Application Submitted",
        message:
          "Your organizer application is pending admin review. We will notify you when it is reviewed.",
        payload: {
          applicationId: application._id,
          status: "pending",
        },
      });

      try {
        await notifyAdminsAboutOrganizerApplication(application);
      } catch (notifyError) {
        console.error(
          "Failed to create admin notification for organizer application:",
          notifyError,
        );
      }

      return res.json({
        message:
          "Documents uploaded successfully! Your application is now pending admin review.",
        uploadedFiles: Object.keys(documents).length,
        applicationId: application._id,
      });
    } catch (err) {
      console.error("Upload Documents Error:", err);
      return res.status(500).json({
        message: "Failed to upload documents.",
        error: err.message,
      });
    }
  },
);

/**
 * GET /api/admin/applications
 *   • Admin‐only: list all applications (sorted by createdAt descending).
 *   • Only shows completed applications (pending, approved, rejected, revoked)
 *   • Excludes "draft" applications (incomplete - no documents uploaded yet)
 */
router.get(
  "/admin/applications",
  requireAuth,
  requireRole(["admin"]),
  listAdminApplications,
);

/**
 * PATCH /api/admin/applications/:id/approve
 *   • Admin approves a pending application:
 *     – set status="approved", reviewedBy, reviewedAt
 *     – update the user: role="organizer", isOrganizerApproved=true
 */
router.patch(
  "/admin/applications/:id/approve",
  requireAuth,
  requireRole(["admin"]),
  approveAdminApplication,
);

/**
 * PATCH /api/admin/applications/:id/reject
 *   • Admin rejects a pending application:
 *     – set status="rejected", reviewedBy, reviewedAt, rejectionReason
 */
router.patch(
  "/admin/applications/:id/reject",
  requireAuth,
  requireRole(["admin"]),
  rejectAdminApplication,
);

/**
 * PATCH /api/admin/applications/:id/revoke
 *   • Admin revokes an approved organizer:
 *     – set status="revoked", reviewedBy, reviewedAt, optionally rejectionReason
 *     – set User.role="donor", isOrganizerApproved=false
 */
router.patch(
  "/admin/applications/:id/revoke",
  requireAuth,
  requireRole(["admin"]),
  revokeAdminApplication,
);

export default router;
