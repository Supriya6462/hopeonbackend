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
  reinstateOrganizer
} from "./organizer.controller.js";
import { documentUpload, organizerDocumentFields } from "../config/multer.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Donor - Submit organizer application
router.post(
  "/apply",
  authenticate,
  authorize(Role.DONOR),
  submitApplication
);

router.post(
  "/apply/draft",
  authenticate,
  authorize(Role.DONOR),
  createDraftApplication
);

router.get(
  "/apply/draft",
  authenticate,
  authorize(Role.DONOR),
  getDraftApplication
);

router.post(
  "/apply/:applicationId/documents",
  authenticate,
  authorize(Role.DONOR),
  documentUpload.fields(organizerDocumentFields),
  uploadDocumentsAndSubmit
);

// Get user's applications
router.get(
  "/my-applications",
  authenticate,
  getUserApplications
);

// Admin - Get all applications
router.get(
  "/applications",
  authenticate,
  authorize(Role.ADMIN),
  getAllApplications
);

// Admin - Get single application
router.get(
  "/applications/:id",
  authenticate,
  authorize(Role.ADMIN),
  getApplicationById
);

// Admin - Approve application
router.patch(
  "/applications/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  approveApplication
);

// Admin - Reject application
router.patch(
  "/applications/:id/reject",
  authenticate,
  authorize(Role.ADMIN),
  rejectApplication
);

// Admin - Get all organizers
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  getAllOrganizers
);

// Admin - Revoke organizer privileges
router.patch(
  "/:id/revoke",
  authenticate,
  authorize(Role.ADMIN),
  revokeOrganizer
);

// Admin - Reinstate organizer privileges
router.patch(
  "/:id/reinstate",
  authenticate,
  authorize(Role.ADMIN),
  reinstateOrganizer
);

export default router;
