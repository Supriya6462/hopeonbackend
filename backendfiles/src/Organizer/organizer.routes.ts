import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../types/enums.js";
import {
  getOrganizerProfile,
  uploadOrganizerProfileDocument,
  upsertOrganizerProfile,
  verifyOrganizerProfile,
  getAdminOrganizerProfiles,
  getOrganizerApplicationStatus,
  getUserApplicationDetails,
  resubmitApplication,
  submitApplication,
  createDraftApplication,
  getDraftApplication,
  uploadDocumentsAndSubmit,
  getUserApplications,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getAllOrganizers,
  revokeOrganizer,
  reinstateOrganizer,
} from "./organizer.controller.js";
import {
  applyFileMetadataForResponse,
  documentUpload,
  handleDocumentUploadError,
  organizerDocumentFields,
} from "../config/multer.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../validation/validate.js";
import {
  applicationIdParamSchema,
  approveApplicationSchema,
  getApplicationsQuerySchema,
  getOrganizersQuerySchema,
  organizerProfileUpsertSchema,
  organizerProfilesQuerySchema,
  organizerProfileVerifySchema,
  organizerIdParamSchema,
  rejectApplicationSchema,
  resubmitApplicationSchema,
  revokeOrganizerSchema,
  submitApplicationSchema,
} from "../validation/organizer.validation.js";

const router = Router();

const singleOrganizerProfileDocumentUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  documentUpload.single("document")(req, res, (error) => {
    if (error) {
      return handleDocumentUploadError(error, res);
    }

    applyFileMetadataForResponse(req);
    return next();
  });
};

router.get(
  "/profile",
  authenticate,
  authorize(Role.ORGANIZER),
  getOrganizerProfile,
);

router.post(
  "/profile/upload-document",
  authenticate,
  authorize(Role.ORGANIZER),
  singleOrganizerProfileDocumentUpload,
  uploadOrganizerProfileDocument,
);

router.post(
  "/profile",
  authenticate,
  authorize(Role.ORGANIZER),
  validateBody(organizerProfileUpsertSchema),
  upsertOrganizerProfile,
);

router.patch(
  "/admin/organizer-profiles/:id/verify",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(organizerIdParamSchema),
  validateBody(organizerProfileVerifySchema),
  verifyOrganizerProfile,
);

router.get(
  "/admin/organizer-profiles",
  authenticate,
  authorize(Role.ADMIN),
  validateQuery(organizerProfilesQuerySchema),
  getAdminOrganizerProfiles,
);

router.get("/application-status", authenticate, getOrganizerApplicationStatus);

router.get(
  "/applications/:applicationId",
  authenticate,
  authorize(Role.DONOR),
  validateParams(applicationIdParamSchema),
  getUserApplicationDetails,
);

router.patch(
  "/applications/:applicationId/resubmit",
  authenticate,
  authorize(Role.DONOR),
  validateParams(applicationIdParamSchema),
  validateBody(resubmitApplicationSchema),
  resubmitApplication,
);

// Donor - Submit organizer application
router.post(
  "/apply",
  authenticate,
  authorize(Role.DONOR),
  validateBody(submitApplicationSchema),
  submitApplication,
);

router.post(
  "/apply/draft",
  authenticate,
  authorize(Role.DONOR),
  validateBody(submitApplicationSchema),
  createDraftApplication,
);

router.get(
  "/apply/draft",
  authenticate,
  authorize(Role.DONOR),
  getDraftApplication,
);

router.post(
  "/apply/:applicationId/documents",
  authenticate,
  authorize(Role.DONOR),
  validateParams(applicationIdParamSchema),
  documentUpload.fields(organizerDocumentFields),
  uploadDocumentsAndSubmit,
);

// Get user's applications
router.get("/my-applications", authenticate, getUserApplications);

// Admin - Get all applications
router.get(
  "/applications",
  authenticate,
  authorize(Role.ADMIN),
  validateQuery(getApplicationsQuerySchema),
  getAllApplications,
);

// Admin - Get single application
router.get(
  "/applications/:id",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(organizerIdParamSchema),
  getApplicationById,
);

// Admin - Approve application
router.patch(
  "/applications/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(organizerIdParamSchema),
  validateBody(approveApplicationSchema),
  approveApplication,
);

// Admin - Reject application
router.patch(
  "/applications/:id/reject",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(organizerIdParamSchema),
  validateBody(rejectApplicationSchema),
  rejectApplication,
);

// Admin - Get all organizers
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validateQuery(getOrganizersQuerySchema),
  getAllOrganizers,
);

// Admin - Revoke organizer privileges
router.patch(
  "/:id/revoke",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(organizerIdParamSchema),
  validateBody(revokeOrganizerSchema),
  revokeOrganizer,
);

// Admin - Reinstate organizer privileges
router.patch(
  "/:id/reinstate",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(organizerIdParamSchema),
  reinstateOrganizer,
);

export default router;
