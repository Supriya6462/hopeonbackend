// import { Router } from "express";
// import Campaign from "../Models/Campaign.js";
// import { requireAuth, requireRole } from "../middleware/auth.js";

// const router = Router();

// /**
//  * GET /api/campaigns?owner=<userId>
//  * Public (but now optionally filters by owner)
//  */
// router.get("/", async (req, res) => {
//   try {
//     const filter = {};
//     // If the client provided ?owner=<userId>, only return that user’s campaigns
//     if (req.query.owner) {
//       filter.owner = req.query.owner;
//     }
//     const campaigns = await Campaign.find(filter).populate(
//       "owner",
//       "name email"
//     );
//     return res.json(campaigns);
//   } catch (err) {
//     return res.status(500).json({ message: "Could not fetch campaigns." });
//   }
// });

// router.get(
//   "/:campaignId/donors",
//   requireAuth,
//   requireRole("organizer"),
//   async (req, res) => {
//     try {
//       const { campaignId } = req.params;

//       // 1) Verify that campaign exists
//       const campaign = await Campaign.findById(campaignId).select("owner");
//       if (!campaign) {
//         return res.status(404).json({ message: "Campaign not found." });
//       }

//       // 2) Only the organizer who owns it can view donors
//       if (campaign.owner.toString() !== req.user.userId) {
//         return res
//           .status(403)
//           .json({ message: "Not authorized to view this campaign’s donors." });
//       }

//       // 3) Fetch all donations for that campaign.
//       //    - Populate `donor` to get name & email if it’s a registered user.
//       //    - Also include donorEmail for PayPal or unregistered donors.
//       //    - Sort by most recent first.
//       const donations = await Donation.find({ campaign: campaignId })
//         .populate("donor", "name email") // bring in donor.name and donor.email if available
//         .sort({ createdAt: -1 });

//       // 4) Return the array of donations
//       return res.json(donations);
//     } catch (err) {
//       console.error("Fetch Donors Error:", err);
//       return res
//         .status(500)
//         .json({ message: "Server error fetching donor list." });
//     }
//   }
// );

// /**
//  * GET /api/campaigns/:campaignId
//  * Public
//  */
// router.get("/:campaignId", async (req, res) => {
//   try {
//     const campaign = await Campaign.findById(req.params.campaignId).populate(
//       "owner",
//       "name email"
//     );
//     if (!campaign)
//       return res.status(404).json({ message: "Campaign not found." });
//     return res.json(campaign);
//   } catch (err) {
//     return res.status(500).json({ message: "Could not fetch campaign." });
//   }
// });

// /**
//  * POST /api/campaigns
//  * Organizer only
//  */
// router.post("/", requireAuth, requireRole("organizer"), async (req, res) => {
//   try {
//     const { title, description, imageURL, target } = req.body;
//     if (!title || !description || !imageURL || !target) {
//       return res.status(400).json({ message: "All fields are required." });
//     }
//     const campaign = await Campaign.create({
//       title,
//       description,
//       imageURL,
//       target,
//       owner: req.user.userId,
//     });
//     return res.status(201).json(campaign);
//   } catch (err) {
//     return res.status(500).json({ message: "Could not create campaign." });
//   }
// });

// /**
//  * PATCH /api/campaigns/:campaignId
//  * Organizer only (must own). Uses findOneAndUpdate filter by owner.
//  */
// router.patch(
//   "/:campaignId",
//   requireAuth,
//   requireRole("organizer"),
//   async (req, res) => {
//     try {
//       // Atomically find + update only if owner matches
//       const updated = await Campaign.findOneAndUpdate(
//         { _id: req.params.campaignId, owner: req.user.userId },
//         { $set: req.body },
//         { new: true, runValidators: true }
//       );

//       if (!updated) {
//         // Either it didn’t exist or owner didn’t match
//         return res
//           .status(403)
//           .json({ message: "Not authorized or campaign not found." });
//       }
//       return res.json(updated);
//     } catch (err) {
//       return res.status(500).json({ message: "Could not update campaign." });
//     }
//   }
// );

// /**
//  * DELETE /api/campaigns/:campaignId
//  * Organizer only (must own). Uses findOneAndDelete filter by owner.
//  */
// router.delete(
//   "/:campaignId",
//   requireAuth,
//   requireRole("organizer"),
//   async (req, res) => {
//     try {
//       const deleted = await Campaign.findOneAndDelete({
//         _id: req.params.campaignId,
//         owner: req.user.userId,
//       });
//       if (!deleted) {
//         return res
//           .status(403)
//           .json({ message: "Not authorized or campaign not found." });
//       }
//       return res.json({ message: "Campaign deleted." });
//     } catch (err) {
//       return res.status(500).json({ message: "Could not delete campaign." });
//     }
//   }
// );

// export default router;

// routes/campaigns.js

// routes/campaigns.js

import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Donation from "../Models/Donation.js";
import Campaign from "../Models/Campaign.js";
import WithdrawalRequest from "../Models/WithdrawalRequest.js";
import { handleUploadError, uploadSingleImage } from "../config/localUpload.js";

const router = Router();

function buildAbsoluteImageUrl(req, imagePath) {
  return `${req.protocol}://${req.get("host")}${imagePath}`;
}

function normalizeCampaignImageUrl(req, imageURL) {
  if (!imageURL || typeof imageURL !== "string") {
    return imageURL;
  }

  if (imageURL.startsWith("http://") || imageURL.startsWith("https://")) {
    return imageURL;
  }

  if (imageURL.startsWith("/uploads/")) {
    return buildAbsoluteImageUrl(req, imageURL);
  }

  if (imageURL.startsWith("uploads/")) {
    return buildAbsoluteImageUrl(req, `/${imageURL}`);
  }

  return imageURL;
}

function normalizeCampaignResponse(req, campaign) {
  const plainCampaign = campaign?.toObject ? campaign.toObject() : campaign;
  if (!plainCampaign) return plainCampaign;

  return {
    ...plainCampaign,
    imageURL: normalizeCampaignImageUrl(req, plainCampaign.imageURL),
  };
}

function parseImageUrlInput(rawImageURL) {
  const imageURL = typeof rawImageURL === "string" ? rawImageURL.trim() : "";
  if (!imageURL) return "";

  let parsed;
  try {
    parsed = new URL(imageURL);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }

  return parsed.toString();
}

function campaignImageUploadMiddleware(req, res, next) {
  uploadSingleImage.single("imageFile")(req, res, (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    return next();
  });
}

async function expireDueCampaigns() {
  const now = new Date();
  await Campaign.updateMany(
    {
      status: "active",
      isDonationEnabled: true,
      deadlineAt: { $lte: now },
    },
    {
      $set: {
        status: "expired",
        isDonationEnabled: false,
        endedAt: now,
        expiresProcessedAt: now,
      },
    },
  );
}

function getDonorFacingPayoutStatus(status) {
  switch (status) {
    case "pending":
    case "under_review":
      return "processing";
    case "approved":
      return "scheduled";
    case "completed":
      return "paid_out";
    default:
      return "unknown";
  }
}

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

/**
 * GET /api/campaigns?owner=<userId>&page=1&limit=10
 */
router.get("/", async (req, res) => {
  try {
    await expireDueCampaigns();

    const filter = {};
    if (req.query.owner) {
      if (!mongoose.isValidObjectId(req.query.owner)) {
        return res.status(400).json({ message: "Invalid owner ID." });
      }
      filter.owner = req.query.owner;
    }

    if (req.query.status) {
      const allowedStatuses = ["active", "expired", "inactive"];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid status filter." });
      }
      filter.status = req.query.status;
    } else {
      // Public campaign list should not include manually inactivated campaigns by default.
      filter.status = { $ne: "inactive" };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    return res.json({
      campaigns: campaigns.map((campaign) =>
        normalizeCampaignResponse(req, campaign),
      ),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Fetch Campaigns Error:", err);
    return res.status(500).json({ message: "Could not fetch campaigns." });
  }
});

/**
 * GET /api/campaigns/:campaignId/donors
 *
 * MUST be defined *before* GET /:campaignId, so Express matches “/123/donors”
 * correctly instead of interpreting “123/donors” as a campaignId.
 */
router.get(
  "/:campaignId/donors",
  requireAuth,
  requireRole("organizer"),
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      // 1) Validate that campaignId is a valid ObjectId string
      if (!mongoose.isValidObjectId(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID." });
      }

      // 2) Verify campaign exists
      const campaign = await Campaign.findById(campaignId).select("owner");
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found." });
      }

      // 3) Ensure the authenticated organizer actually owns this campaign
      if (campaign.owner.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this campaign’s donors." });
      }

      // 4) Fetch all Donation docs for that campaign, populate donor info
      const donations = await Donation.find({ campaign: campaignId })
        .populate("donor", "name email")
        .sort({ createdAt: -1 }); // newest first

      const sanitizedDonations = donations.map((donation) => {
        const item = donation.toObject();

        if (item.isAnonymous) {
          item.payerName = "Anonymous Donor";
          item.payerEmail = null;
          item.donorEmail = null;

          if (item.donor) {
            item.donor = {
              ...item.donor,
              name: "Anonymous Donor",
              email: null,
            };
          }
        }

        return item;
      });

      return res.json(sanitizedDonations);
    } catch (err) {
      console.error("Fetch Donors Error:", err);
      return res
        .status(500)
        .json({ message: "Server error fetching donor list." });
    }
  },
);

/**
 * GET /api/campaigns/:campaignId/payout-history
 * Public donor-safe payout timeline for campaign transparency.
 */
router.get("/:campaignId/payout-history", async (req, res) => {
  try {
    await expireDueCampaigns();

    const { campaignId } = req.params;
    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ message: "Invalid campaign ID." });
    }

    const campaign = await Campaign.findById(campaignId).select(
      "title target raised status isDonationEnabled",
    );
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found." });
    }

    const payoutStatuses = ["pending", "under_review", "approved", "completed"];
    const withdrawals = await WithdrawalRequest.find({
      campaign: campaignId,
      status: { $in: payoutStatuses },
    })
      .select(
        "status amount createdAt reviewedAt completedAt transactionReference",
      )
      .sort({ createdAt: -1 })
      .lean();

    const summary = withdrawals.reduce(
      (acc, withdrawal) => {
        const amount = Number(withdrawal.amount || 0);

        if (withdrawal.status === "completed") {
          acc.totalPaidOut += amount;
          if (
            !acc.lastTransferDate ||
            withdrawal.completedAt > acc.lastTransferDate
          ) {
            acc.lastTransferDate = withdrawal.completedAt;
          }
        }

        acc.totalCommitted += amount;
        return acc;
      },
      {
        totalRaised: Number(campaign.raised || 0),
        totalCommitted: 0,
        totalPaidOut: 0,
        lastTransferDate: null,
      },
    );

    const timeline = withdrawals.map((withdrawal) => {
      const eventDate =
        withdrawal.completedAt || withdrawal.reviewedAt || withdrawal.createdAt;

      return {
        id: withdrawal._id,
        status: getDonorFacingPayoutStatus(withdrawal.status),
        amount: Number(withdrawal.amount || 0),
        eventDate,
        createdAt: withdrawal.createdAt,
        transferReferenceMasked:
          withdrawal.status === "completed"
            ? maskTransactionReference(withdrawal.transactionReference)
            : null,
      };
    });

    return res.json({
      campaign: {
        _id: campaign._id,
        title: campaign.title,
        target: campaign.target,
        raised: campaign.raised,
        status: campaign.status,
        isDonationEnabled: campaign.isDonationEnabled,
      },
      summary: {
        totalRaised: summary.totalRaised,
        totalCommitted: summary.totalCommitted,
        totalPaidOut: summary.totalPaidOut,
        availableBalance: Math.max(
          0,
          summary.totalRaised - summary.totalCommitted,
        ),
        lastTransferDate: summary.lastTransferDate,
      },
      timeline,
    });
  } catch (err) {
    console.error("Fetch Campaign Payout History Error:", err);
    return res.status(500).json({ message: "Could not fetch payout history." });
  }
});

/**
 * GET /api/campaigns/:campaignId
 */
router.get("/:campaignId", async (req, res) => {
  try {
    await expireDueCampaigns();

    const { campaignId } = req.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ message: "Invalid campaign ID." });
    }

    const campaign = await Campaign.findById(campaignId).populate(
      "owner",
      "name email",
    );
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found." });
    }
    return res.json(normalizeCampaignResponse(req, campaign));
  } catch (err) {
    console.error("Fetch Campaign Error:", err);
    return res.status(500).json({ message: "Could not fetch campaign." });
  }
});

/**
 * POST /api/campaigns
 */
router.post(
  "/",
  requireAuth,
  requireRole("organizer"),
  campaignImageUploadMiddleware,
  async (req, res) => {
    try {
      const { title, description, imageURL, target, deadlineAt, duration } =
        req.body;
      const parsedImageURL = parseImageUrlInput(imageURL);
      const hasUploadedFile = Boolean(req.file);
      const hasImageURL = Boolean(parsedImageURL);

      if (!title || !description || !target) {
        return res.status(400).json({ message: "All fields are required." });
      }

      if (hasUploadedFile === hasImageURL) {
        return res.status(400).json({
          message:
            "Provide exactly one image source: upload a file or provide an image URL.",
        });
      }

      if (parsedImageURL === null) {
        return res.status(400).json({ message: "Invalid image URL." });
      }

      const parsedTarget = Number(target);
      if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
        return res
          .status(400)
          .json({ message: "Target must be a positive number." });
      }

      let parsedDeadline = null;
      if (deadlineAt) {
        parsedDeadline = new Date(deadlineAt);
        if (Number.isNaN(parsedDeadline.getTime())) {
          return res.status(400).json({ message: "Invalid deadlineAt value." });
        }
      } else if (Number.isFinite(Number(duration)) && Number(duration) > 0) {
        parsedDeadline = new Date(
          Date.now() + Number(duration) * 24 * 60 * 60 * 1000,
        );
      }

      const resolvedImageURL = hasUploadedFile
        ? buildAbsoluteImageUrl(req, `/uploads/${req.file.filename}`)
        : parsedImageURL;

      const campaign = await Campaign.create({
        title,
        description,
        imageURL: resolvedImageURL,
        target: parsedTarget,
        ...(parsedDeadline ? { deadlineAt: parsedDeadline } : {}),
        owner: req.user.userId,
      });
      return res.status(201).json(normalizeCampaignResponse(req, campaign));
    } catch (err) {
      console.error("Create Campaign Error:", err);
      return res.status(500).json({ message: "Could not create campaign." });
    }
  },
);

/**
 * PATCH /api/campaigns/:campaignId
 */
router.patch(
  "/:campaignId",
  requireAuth,
  requireRole("organizer"),
  campaignImageUploadMiddleware,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      if (!mongoose.isValidObjectId(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID." });
      }

      const { title, description, imageURL, target, deadlineAt, duration } =
        req.body;

      const updates = {};

      if (typeof title === "string") {
        updates.title = title.trim();
      }

      if (typeof description === "string") {
        updates.description = description.trim();
      }

      if (target !== undefined) {
        const parsedTarget = Number(target);
        if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
          return res
            .status(400)
            .json({ message: "Target must be a positive number." });
        }
        updates.target = parsedTarget;
      }

      const parsedImageURL = parseImageUrlInput(imageURL);
      const hasUploadedFile = Boolean(req.file);
      const imageURLProvided =
        typeof imageURL === "string" && imageURL.trim().length > 0;

      if (hasUploadedFile && imageURLProvided) {
        return res.status(400).json({
          message:
            "Provide exactly one image source: upload a file or provide an image URL.",
        });
      }

      if (imageURLProvided && parsedImageURL === null) {
        return res.status(400).json({ message: "Invalid image URL." });
      }

      if (hasUploadedFile) {
        updates.imageURL = buildAbsoluteImageUrl(
          req,
          `/uploads/${req.file.filename}`,
        );
      } else if (parsedImageURL) {
        updates.imageURL = parsedImageURL;
      }

      if (deadlineAt) {
        const parsedDeadline = new Date(deadlineAt);
        if (Number.isNaN(parsedDeadline.getTime())) {
          return res.status(400).json({ message: "Invalid deadlineAt value." });
        }
        updates.deadlineAt = parsedDeadline;
      } else if (Number.isFinite(Number(duration)) && Number(duration) > 0) {
        updates.deadlineAt = new Date(
          Date.now() + Number(duration) * 24 * 60 * 60 * 1000,
        );
      }

      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid fields provided for update." });
      }

      const updated = await Campaign.findOneAndUpdate(
        { _id: campaignId, owner: req.user.userId },
        { $set: updates },
        { new: true, runValidators: true },
      );
      if (!updated) {
        return res
          .status(403)
          .json({ message: "Not authorized or campaign not found." });
      }
      return res.json(normalizeCampaignResponse(req, updated));
    } catch (err) {
      console.error("Update Campaign Error:", err);
      return res.status(500).json({ message: "Could not update campaign." });
    }
  },
);

/**
 * DELETE /api/campaigns/:campaignId
 */
router.delete(
  "/:campaignId",
  requireAuth,
  requireRole("organizer"),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      if (!mongoose.isValidObjectId(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID." });
      }

      const deleted = await Campaign.findOneAndUpdate(
        {
          _id: campaignId,
          owner: req.user.userId,
        },
        {
          $set: {
            status: "inactive",
            isDonationEnabled: false,
            endedAt: new Date(),
          },
        },
        { new: true },
      );
      if (!deleted) {
        return res
          .status(403)
          .json({ message: "Not authorized or campaign not found." });
      }
      return res.json({ message: "Campaign marked as inactive." });
    } catch (err) {
      console.error("Delete Campaign Error:", err);
      return res.status(500).json({ message: "Could not delete campaign." });
    }
  },
);

export default router;
