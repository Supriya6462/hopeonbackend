import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import {
  getAdminActivities,
  getAdminCampaignDetails,
  getAdminCampaigns,
  getAdminDashboardStats,
  getAdminDonations,
  getAdminUserDetails,
  getAdminUserDonations,
  getAdminUsers,
  patchAdminUserStatus,
  removeAdminCampaign,
} from "../controllers/adminController.js";

const router = express.Router();

// Dashboard statistics
router.get(
  "/admin/dashboard/stats",
  authenticateToken,
  requireRole(["admin"]),
  getAdminDashboardStats,
);

// User Management - Get all users
router.get(
  "/admin/users",
  authenticateToken,
  requireRole(["admin"]),
  getAdminUsers,
);

// Get user details with activity
router.get(
  "/admin/users/:userId",
  authenticateToken,
  requireRole(["admin"]),
  getAdminUserDetails,
);

// Update user status
router.patch(
  "/admin/users/:userId/status",
  authenticateToken,
  requireRole(["admin"]),
  patchAdminUserStatus,
);

// Get user donations
router.get(
  "/admin/users/:userId/donations",
  authenticateToken,
  requireRole(["admin"]),
  getAdminUserDonations,
);

// Campaign Management - Get all campaigns
router.get(
  "/admin/campaigns",
  authenticateToken,
  requireRole(["admin"]),
  getAdminCampaigns,
);

// Get campaign details with donations
router.get(
  "/admin/campaigns/:campaignId",
  authenticateToken,
  requireRole(["admin"]),
  getAdminCampaignDetails,
);

// Delete campaign (admin only)
router.delete(
  "/admin/campaigns/:campaignId",
  authenticateToken,
  requireRole(["admin"]),
  removeAdminCampaign,
);

// Get all donations
router.get(
  "/admin/donations",
  authenticateToken,
  requireRole(["admin"]),
  getAdminDonations,
);

// Get all activity logs
router.get(
  "/admin/activities",
  authenticateToken,
  requireRole(["admin"]),
  getAdminActivities,
);

export default router;
