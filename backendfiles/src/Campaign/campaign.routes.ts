import { Router } from "express";
import {
  authenticate,
  authorize,
  requireApprovedOrganizer,
} from "../middleware/auth.middleware.js";
import { Role } from "../types/enums.js";
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  approveCampaign,
  closeCampaign,
  deleteCampaign,
} from "./campaign.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../validation/validate.js";
import {
  campaignIdParamSchema,
  campaignQuerySchema,
  createCampaignSchema,
  updateCampaignSchema,
} from "../validation/campaign.validation.js";

const router = Router();

// Public routes - No authentication required
router.get(
  "/allcampaignlist",
  validateQuery(campaignQuerySchema),
  getCampaigns,
);
router.get("/:id", validateParams(campaignIdParamSchema), getCampaignById);

// Organizer routes - Requires authentication and organizer role
router.post(
  "/",
  authenticate,
  authorize(Role.ORGANIZER),
  requireApprovedOrganizer,
  validateBody(createCampaignSchema),
  createCampaign,
);

// Organizer/Admin routes - Update campaign
router.put(
  "/:id",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validateParams(campaignIdParamSchema),
  validateBody(updateCampaignSchema),
  updateCampaign,
);

// Admin only routes
router.patch(
  "/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(campaignIdParamSchema),
  approveCampaign,
);

// Organizer/Admin routes - Close and delete
router.patch(
  "/:id/close",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validateParams(campaignIdParamSchema),
  closeCampaign,
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validateParams(campaignIdParamSchema),
  deleteCampaign,
);

export default router;
