import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../Authentication/auth.middleware.js";
import { donationController } from "./donation.controller.js";
import { Role } from "../types/enums.js";

const router = Router();

// Donor - Create donation
router.post(
  "/",
  authenticate,
  authorize(Role.DONOR, Role.ORGANIZER, Role.ADMIN),
  donationController.createDonation.bind(donationController)
);

// Update donation status (webhook or internal)
router.patch(
  "/:id/status",
  authenticate,
  authorize(Role.ADMIN),
  donationController.updateDonationStatus.bind(donationController)
);

// Get donations by campaign (public for completed donations)
router.get(
  "/campaign/:campaignId",
  donationController.getDonationsByCampaign.bind(donationController)
);

// Get user's donations
router.get(
  "/my-donations",
  authenticate,
  donationController.getDonationsByDonor.bind(donationController)
);

// Get donation statistics (all campaigns)
router.get(
  "/stats",
  authenticate,
  donationController.getDonationStats.bind(donationController)
);

// Get donation statistics (specific campaign)
router.get(
  "/stats/:campaignId",
  authenticate,
  donationController.getDonationStats.bind(donationController)
);

// Admin - Get all donations (must be last to avoid route conflicts)
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  donationController.getAllDonations.bind(donationController)
);

export default router;
