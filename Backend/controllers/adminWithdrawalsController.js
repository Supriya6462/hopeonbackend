import {
  sendDonorCampaignPayoutUpdateEmail,
  sendWithdrawalStatusEmail,
} from "../services/emailService.js";
import {
  getWithdrawalRequestDetails,
  listWithdrawalRequests,
  updateWithdrawalStatus,
  verifyWithdrawalDocument,
} from "../services/adminWithdrawalsService.js";
import Donation from "../Models/Donation.js";
import ActivityLog from "../Models/ActivityLog.js";
import {
  createInAppNotification,
  notifyCampaignDonorsInApp,
} from "../services/notificationService.js";
import { recordPayoutFromWithdrawal } from "../services/blockchainService.js";

const DONOR_TRANSPARENCY_STATUSES = new Set(["approved", "completed"]);

function maskTransactionReference(reference) {
  if (!reference || typeof reference !== "string") {
    return null;
  }

  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export async function listAdminWithdrawalRequests(req, res) {
  try {
    const result = await listWithdrawalRequests({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      withdrawalRequests: result.withdrawalRequests,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total,
    });
  } catch (error) {
    console.error("Error fetching withdrawal requests:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminWithdrawalRequestDetails(req, res) {
  try {
    const result = await getWithdrawalRequestDetails({
      withdrawalRequestId: req.params.id,
      requesterRole: req.user.role,
      requesterUserId: req.user.userId,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json(result.withdrawalRequest);
  } catch (error) {
    console.error("Error fetching withdrawal request:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function updateAdminWithdrawalRequestStatus(req, res) {
  try {
    const { status, reviewNotes, rejectionReason, transactionReference } =
      req.body;

    const result = await updateWithdrawalStatus({
      withdrawalRequestId: req.params.id,
      adminUserId: req.user.userId,
      status,
      reviewNotes,
      rejectionReason,
      transactionReference,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    let payoutLedgerResult = null;
    if (status === "completed") {
      try {
        payoutLedgerResult = await recordPayoutFromWithdrawal({
          withdrawalRequestId: result.withdrawalRequest._id,
          paidDate:
            result.withdrawalRequest.completedAt?.toISOString?.() ||
            new Date().toISOString(),
          amount: result.withdrawalRequest.amount,
          campaignId: result.withdrawalRequest.campaign._id,
          transactionReference,
        });
      } catch (ledgerError) {
        console.error("Payout block record failed:", ledgerError);
      }
    }

    try {
      await sendWithdrawalStatusEmail(
        result.withdrawalRequest.organizer.email,
        result.withdrawalRequest.organizer.name,
        {
          status,
          amount: result.withdrawalRequest.amount,
          campaignTitle: result.withdrawalRequest.campaign.title,
          reviewNotes,
          rejectionReason,
          transactionReference,
        },
      );

      await createInAppNotification({
        recipient: result.withdrawalRequest.organizer._id,
        eventType: `withdrawal_${status}`,
        title: "Withdrawal Request Updated",
        message: `Your withdrawal request for ${result.withdrawalRequest.campaign.title} is now ${status}.`,
        payload: {
          withdrawalRequestId: result.withdrawalRequest._id,
          campaignId: result.withdrawalRequest.campaign._id,
          status,
          reviewNotes,
          rejectionReason,
          transactionReference,
        },
      });
    } catch (emailError) {
      console.error("Error sending withdrawal status email:", emailError);
    }

    if (DONOR_TRANSPARENCY_STATUSES.has(status)) {
      try {
        const donorIds = await Donation.distinct("donor", {
          campaign: result.withdrawalRequest.campaign._id,
          status: "COMPLETED",
        });

        let donorEmailCount = 0;

        if (donorIds.length) {
          const User = (await import("../Models/User.js")).default;
          const donors = await User.find({ _id: { $in: donorIds } }).select(
            "name email",
          );

          const transferReferenceMasked =
            status === "completed"
              ? maskTransactionReference(transactionReference)
              : null;

          const eventDate =
            status === "completed"
              ? result.withdrawalRequest.completedAt
              : result.withdrawalRequest.reviewedAt;

          const donorEmailResults = await Promise.all(
            donors.map(async (donor) => {
              if (!donor.email) {
                return false;
              }

              try {
                await sendDonorCampaignPayoutUpdateEmail(
                  donor.email,
                  donor.name,
                  {
                    campaignTitle: result.withdrawalRequest.campaign.title,
                    status,
                    amount: result.withdrawalRequest.amount,
                    eventDate,
                    transferReferenceMasked,
                  },
                );
                return true;
              } catch (donorEmailError) {
                console.error(
                  `Error sending donor payout update email to ${donor.email}:`,
                  donorEmailError,
                );
                return false;
              }
            }),
          );

          donorEmailCount = donorEmailResults.filter(Boolean).length;
        }

        const inAppResult = await notifyCampaignDonorsInApp({
          campaignId: result.withdrawalRequest.campaign._id,
          withdrawalRequestId: result.withdrawalRequest._id,
          campaignTitle: result.withdrawalRequest.campaign.title,
          status,
          amount: result.withdrawalRequest.amount,
          eventDate:
            status === "completed"
              ? result.withdrawalRequest.completedAt
              : result.withdrawalRequest.reviewedAt,
        });

        await ActivityLog.create({
          user: req.user.userId,
          activityType: "donor_transparency_notified",
          description: `Donor transparency notifications sent for campaign "${result.withdrawalRequest.campaign.title}"`,
          metadata: {
            campaignId: result.withdrawalRequest.campaign._id,
            withdrawalRequestId: result.withdrawalRequest._id,
            status,
            donorEmailCount,
            donorInAppCount: inAppResult.notifiedCount,
          },
          relatedEntity: {
            entityType: "WithdrawalRequest",
            entityId: result.withdrawalRequest._id,
          },
        });
      } catch (donorNotificationError) {
        console.error(
          "Error sending donor transparency notifications:",
          donorNotificationError,
        );
      }
    }

    return res.json({
      message: `Withdrawal request ${status} successfully`,
      withdrawalRequest: result.withdrawalRequest,
      payoutTransactionHash: payoutLedgerResult?.transactionHash || null,
      payoutLedgerBlock: payoutLedgerResult?.block || null,
    });
  } catch (error) {
    console.error("Error updating withdrawal request:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function verifyAdminWithdrawalDocument(req, res) {
  try {
    const result = await verifyWithdrawalDocument({
      withdrawalRequestId: req.params.id,
      documentType: req.body.documentType,
      verified: req.body.verified,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      message: `Document ${req.body.verified ? "verified" : "unverified"} successfully`,
      withdrawalRequest: result.withdrawalRequest,
    });
  } catch (error) {
    console.error("Error verifying document:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}
