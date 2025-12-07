import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../Authentication/auth.middleware.js";
import { Role } from "../types/enums.js";
import { organizerController } from "./organizer.controller.js";

const router = Router();

// Donor - Submit organizer application
router.post(
  "/apply",
  authenticate,
  authorize(Role.DONOR),
  organizerController.submitApplication.bind(organizerController)
);

// Get user's applications
router.get(
  "/my-applications",
  authenticate,
  organizerController.getUserApplications.bind(organizerController)
);

// Admin - Get all applications
router.get(
  "/applications",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.getAllApplications.bind(organizerController)
);

// Admin - Get single application
router.get(
  "/applications/:id",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.getApplicationById.bind(organizerController)
);

// Admin - Approve application
router.patch(
  "/applications/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.approveApplication.bind(organizerController)
);

// Admin - Reject application
router.patch(
  "/applications/:id/reject",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.rejectApplication.bind(organizerController)
);

// Admin - Get all organizers
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.getAllOrganizers.bind(organizerController)
);

// Admin - Revoke organizer privileges
router.patch(
  "/:id/revoke",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.revokeOrganizer.bind(organizerController)
);

// Admin - Reinstate organizer privileges
router.patch(
  "/:id/reinstate",
  authenticate,
  authorize(Role.ADMIN),
  organizerController.reinstateOrganizer.bind(organizerController)
);

export default router;
