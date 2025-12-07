import { Router } from "express";
import {
  authenticate,
  authorize,
  requireApprovedOrganizer,
} from "../Authentication/auth.middleware.js";
import { Role } from "../types/enums.js";
import { CampaignController } from "./campaign.controller.js";

const router = Router();
const campaignController = new CampaignController();

// Public routes - No authentication required
router.get("/", campaignController.getcampaigns.bind(campaignController));
router.get("/:id", campaignController.getcampaignById.bind(campaignController));

// Organizer routes - Requires authentication and organizer role
router.post(
  "/",
  authenticate,
  authorize(Role.ORGANIZER),
  requireApprovedOrganizer,
  campaignController.createcampaign.bind(campaignController)
);

// Organizer/Admin routes - Update campaign
router.put(
  "/:id",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  campaignController.updateCampaign.bind(campaignController)
);

// Admin only routes
router.patch(
  "/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  campaignController.approveCampaign.bind(campaignController)
);

// Organizer/Admin routes - Close and delete
router.patch(
  "/:id/close",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  campaignController.closeCampaign.bind(campaignController)
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  campaignController.deleteCampaign.bind(campaignController)
);

export default router;
