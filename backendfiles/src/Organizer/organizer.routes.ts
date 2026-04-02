import { Router } from "express";
import { Role } from "../types/enums.js";
import {
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
import { documentUpload, organizerDocumentFields } from "../config/multer.js";
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
  organizerIdParamSchema,
  rejectApplicationSchema,
  revokeOrganizerSchema,
  submitApplicationSchema,
} from "../validation/organizer.validation.js";

const router = Router();

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
