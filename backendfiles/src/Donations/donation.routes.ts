import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { donationController } from "./donation.controller.js";
import { Role } from "../types/enums.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../validation/validate.js";
import {
  campaignIdParamSchema,
  createDonationSchema,
  donationIdParamSchema,
  donationListQuerySchema,
  updateDonationStatusSchema,
} from "../validation/donation.validation.js";

const router = Router();

// Donor - Create donation
router.post(
  "/",
  authenticate,
  authorize(Role.DONOR, Role.ORGANIZER, Role.ADMIN),
  validateBody(createDonationSchema),
  donationController.createDonation.bind(donationController),
);

// Update donation status (webhook or internal)
router.patch(
  "/:id/status",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(donationIdParamSchema),
  validateBody(updateDonationStatusSchema),
  donationController.updateDonationStatus.bind(donationController),
);

// Get donations by campaign (public for completed donations)
router.get(
  "/campaign/:campaignId",
  validateParams(campaignIdParamSchema),
  donationController.getDonationsByCampaign.bind(donationController),
);

// Get user's donations
router.get(
  "/my-donations",
  authenticate,
  donationController.getDonationsByDonor.bind(donationController),
);

// Get donation statistics (all campaigns)
router.get(
  "/stats",
  authenticate,
  donationController.getDonationStats.bind(donationController),
);

// Get donation statistics (specific campaign)
router.get(
  "/stats/:campaignId",
  authenticate,
  donationController.getDonationStats.bind(donationController),
);

// Admin - Get all donations (must be last to avoid route conflicts)
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validateQuery(donationListQuerySchema),
  donationController.getAllDonations.bind(donationController),
);

export default router;
