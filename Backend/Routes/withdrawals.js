import express from "express";
import WithdrawalRequest from "../Models/WithdrawalRequest.js";
import Campaign from "../Models/Campaign.js";
import Donation from "../Models/Donation.js";
import OrganizerProfile from "../Models/OrganizerProfile.js";
import ActivityLog from "../Models/ActivityLog.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { sendWithdrawalRequestEmail } from "../services/emailService.js";
import { createInAppNotification } from "../services/notificationService.js";
import {
  applyFileMetadataForResponse,
  handleDocumentUploadError,
  uploadSingleDocument,
} from "../config/localDocumentUpload.js";
import {
  buildRequestHash,
  getStoredIdempotentResponse,
  storeIdempotentResponse,
} from "../utils/idempotency.js";
import {
  getAdminWithdrawalRequestDetails,
  listAdminWithdrawalRequests,
  updateAdminWithdrawalRequestStatus,
  verifyAdminWithdrawalDocument,
} from "../controllers/adminWithdrawalsController.js";

const router = express.Router();

function singleDocumentUploadMiddleware(req, res, next) {
  uploadSingleDocument.single("document")(req, res, (error) => {
    if (error) {
      return handleDocumentUploadError(error, res);
    }

    applyFileMetadataForResponse(req);
    return next();
  });
}

// Upload document for withdrawal request (local storage)
router.post(
  "/withdrawal-requests/upload-document",
  authenticateToken,
  requireRole(["organizer"]),
  singleDocumentUploadMiddleware,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      res.json({
        message: "Document uploaded successfully",
        url: req.file.location,
        key: req.file.key,
        documentType: req.body.documentType,
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Create withdrawal request (Organizer only)
router.post(
  "/withdrawal-requests",
  authenticateToken,
  requireRole(["organizer"]),
  async (req, res) => {
    try {
      const { campaignId, amount } = req.body;
      const idempotencyKey = req.get("Idempotency-Key") || "";

      if (!campaignId || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          message: "campaignId and a positive numeric amount are required.",
        });
      }

      const requestHash = buildRequestHash({ campaignId, amount });
      const idempotencyState = await getStoredIdempotentResponse({
        idempotencyKey,
        userId: req.user.userId,
        endpoint: "withdrawal_create",
        requestHash,
      });

      if (idempotencyState.conflict) {
        return res
          .status(idempotencyState.statusCode)
          .json(idempotencyState.responseBody);
      }

      if (idempotencyState.replay) {
        return res
          .status(idempotencyState.statusCode)
          .json(idempotencyState.responseBody);
      }

      const organizerProfile = await OrganizerProfile.findOne({
        organizer: req.user.userId,
      });
      if (!organizerProfile) {
        return res.status(400).json({
          message:
            "Organizer profile not found. Complete your KYC/bank profile before requesting withdrawals.",
          code: "ORGANIZER_PROFILE_REQUIRED",
        });
      }

      if (organizerProfile.verificationStatus !== "verified") {
        return res.status(400).json({
          message:
            "Organizer profile is not verified yet. You can request withdrawals after verification.",
          code: "ORGANIZER_PROFILE_NOT_VERIFIED",
          verificationStatus: organizerProfile.verificationStatus,
          rejectionReason: organizerProfile.rejectionReason,
        });
      }

      // Validate campaign ownership
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.owner.toString() !== req.user.userId) {
        return res.status(403).json({ message: "You don't own this campaign" });
      }

      // Calculate total donations for this campaign
      const donations = await Donation.aggregate([
        {
          $match: {
            campaign: campaign._id,
            status: "COMPLETED",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalRaised = donations[0]?.total || 0;

      // Check if requested amount is available
      const previousWithdrawals = await WithdrawalRequest.aggregate([
        {
          $match: {
            campaign: campaign._id,
            status: {
              $in: ["pending", "under_review", "approved", "completed"],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalWithdrawn = previousWithdrawals[0]?.total || 0;
      const availableAmount = totalRaised - totalWithdrawn;

      if (amount > availableAmount) {
        return res.status(400).json({
          message: "Insufficient funds",
          available: availableAmount,
          requested: amount,
        });
      }

      // Create withdrawal request
      const withdrawalRequest = new WithdrawalRequest({
        organizer: req.user.userId,
        organizerProfile: organizerProfile._id,
        campaign: campaignId,
        amount,
        availableBalanceSnapshot: availableAmount,
        totalRaisedSnapshot: totalRaised,
        totalWithdrawnSnapshot: totalWithdrawn,
        bankDetails: organizerProfile.getDecryptedBankDetails(),
        documents: organizerProfile.documents,
        kycInfo: organizerProfile.kycInfo,
        status: "pending",
      });

      await withdrawalRequest.save();

      // Log activity
      await ActivityLog.create({
        user: req.user.userId,
        activityType: "withdrawal_requested",
        description: `Withdrawal request of $${amount} for campaign "${campaign.title}"`,
        metadata: {
          campaignId,
          amount,
          withdrawalRequestId: withdrawalRequest._id,
        },
        relatedEntity: {
          entityType: "WithdrawalRequest",
          entityId: withdrawalRequest._id,
        },
      });

      await createInAppNotification({
        recipient: req.user.userId,
        eventType: "withdrawal_requested",
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal request for ${campaign.title} is pending review.`,
        payload: {
          withdrawalRequestId: withdrawalRequest._id,
          campaignId: campaign._id,
          amount,
          status: "pending",
        },
      });

      // Notify all admins about the new withdrawal request
      try {
        const User = (await import("../Models/User.js")).default;
        const admins = await User.find({ role: "admin" }).select("_id");
        if (admins.length) {
          await Promise.all(
            admins.map((admin) =>
              createInAppNotification({
                recipient: admin._id,
                eventType: "withdrawal_request_pending_review",
                title: "New Withdrawal Request",
                message: `A withdrawal request of $${amount} needs review for "${campaign.title}".`,
                payload: {
                  withdrawalRequestId: withdrawalRequest._id,
                  campaignId: campaign._id,
                  amount,
                  status: "pending",
                },
              }),
            ),
          );
        }
      } catch (notifyError) {
        console.error(
          "Failed to create admin notification for withdrawal request:",
          notifyError,
        );
      }

      // Send email notification to organizer
      try {
        const User = (await import("../Models/User.js")).default;
        const organizer = await User.findById(req.user.userId);
        if (organizer) {
          await sendWithdrawalRequestEmail(
            organizer,
            campaign,
            withdrawalRequest,
          );
        }
      } catch (emailError) {
        console.error("Error sending withdrawal request email:", emailError);
      }

      const responseBody = {
        message: "Withdrawal request submitted successfully",
        withdrawalRequest,
      };

      await storeIdempotentResponse({
        idempotencyKey,
        userId: req.user.userId,
        endpoint: "withdrawal_create",
        requestHash,
        statusCode: 201,
        responseBody,
      });

      res.status(201).json(responseBody);
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Get organizer's withdrawal requests
router.get(
  "/withdrawal-requests/my-requests",
  authenticateToken,
  requireRole(["organizer"]),
  async (req, res) => {
    try {
      const withdrawalRequests = await WithdrawalRequest.find({
        organizer: req.user.userId,
      })
        .populate("campaign", "title imageURL target raised")
        .populate("organizerProfile", "verificationStatus")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 });

      res.json(withdrawalRequests);
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Get available balance for a campaign
router.get(
  "/withdrawal-requests/available-balance/:campaignId",
  authenticateToken,
  requireRole(["organizer"]),
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.owner.toString() !== req.user.userId) {
        return res.status(403).json({ message: "You don't own this campaign" });
      }

      // Calculate total raised
      const donations = await Donation.aggregate([
        {
          $match: {
            campaign: campaign._id,
            status: "COMPLETED",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalRaised = donations[0]?.total || 0;

      // Calculate total withdrawn/pending
      const withdrawals = await WithdrawalRequest.aggregate([
        {
          $match: {
            campaign: campaign._id,
            status: {
              $in: ["pending", "under_review", "approved", "completed"],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalWithdrawn = withdrawals[0]?.total || 0;
      const availableBalance = totalRaised - totalWithdrawn;

      res.json({
        campaignId,
        totalRaised,
        totalWithdrawn,
        availableBalance,
      });
    } catch (error) {
      console.error("Error fetching available balance:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Admin: Get all withdrawal requests
router.get(
  "/withdrawal-requests",
  authenticateToken,
  requireRole(["admin"]),
  listAdminWithdrawalRequests,
);

// Admin: Get single withdrawal request details
router.get(
  "/withdrawal-requests/:id",
  authenticateToken,
  requireRole(["admin", "organizer"]),
  getAdminWithdrawalRequestDetails,
);

// Admin: Update withdrawal request status
router.patch(
  "/withdrawal-requests/:id/status",
  authenticateToken,
  requireRole(["admin"]),
  updateAdminWithdrawalRequestStatus,
);

// Admin: Verify document
router.patch(
  "/withdrawal-requests/:id/verify-document",
  authenticateToken,
  requireRole(["admin"]),
  verifyAdminWithdrawalDocument,
);

export default router;
