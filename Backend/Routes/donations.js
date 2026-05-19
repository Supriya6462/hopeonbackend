import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Donation from "../Models/Donation.js";
import Campaign from "../Models/Campaign.js";
import { getMyDonationTransparency } from "../services/blockchainService.js";
import { tryIncrementCampaignRaisedWithinTarget } from "../services/donationCapacityService.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📋 Fetching donations for user:");
    console.log("  Email:", req.user.email);
    console.log("  User ID:", req.user.userId);
    console.log("  Role:", req.user.role);
    console.log("=".repeat(60));

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Debug: Check what's in the database
    const allDonationsForEmail = await Donation.find({
      donorEmail: req.user.email,
    }).lean();
    console.log(
      `  Total donations in DB for ${req.user.email}: ${allDonationsForEmail.length}`,
    );

    if (allDonationsForEmail.length > 0) {
      console.log("  Sample donation emails in DB:");
      allDonationsForEmail.slice(0, 3).forEach((d, i) => {
        console.log(
          `    ${i + 1}. donorEmail: "${d.donorEmail}" (exact match: ${d.donorEmail === req.user.email})`,
        );
      });
    }

    const [allDonations, total] = await Promise.all([
      getMyDonationTransparency({ donorEmail: req.user.email }),
      Donation.countDocuments({ donorEmail: req.user.email }),
    ]);

    const donations = allDonations.slice(skip, skip + limit);

    console.log(`✅ Returning ${donations.length} donations (total: ${total})`);
    console.log("=".repeat(60) + "\n");

    return res.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Get My Donations Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch donation history." });
  }
});
/**
 * POST /api/donations
 * Protected: Only "donor" can call.
 * Body: { campaign: "<campaignId>", amount: Number, method: String }
 * Creates a new Donation and increments the Campaign’s raised amount.
 */
router.post("/", requireAuth, requireRole("donor"), async (req, res) => {
  try {
    const { campaign: campaignId, amount, method } = req.body;
    const parsedAmount = Number.parseFloat(amount);

    // Validate input
    if (!campaignId || !amount || !method) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be positive." });
    }
    if (parsedAmount >= 10000) {
      return res.status(400).json({
        message:
          "Donation amount is maximum 10000 more than that is not allowed",
      });
    }

    const incrementResult = await tryIncrementCampaignRaisedWithinTarget({
      campaignId,
      amount: parsedAmount,
    });

    if (!incrementResult.ok) {
      return res.status(incrementResult.status).json({
        message: incrementResult.message,
        code: incrementResult.code,
        remainingAmount: incrementResult.remainingAmount,
      });
    }

    let donation;
    try {
      donation = await Donation.create({
        campaign: campaignId,
        donor: req.user.userId,
        donorEmail: req.user.email,
        amount: parsedAmount,
        method,
        transactionId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        status: "COMPLETED",
        payerEmail: req.user.email,
        payerName: req.user.name || "Direct Donor",
      });
    } catch (createError) {
      await Campaign.updateOne(
        { _id: campaignId },
        { $inc: { raised: -parsedAmount } },
      );
      throw createError;
    }

    // Return the newly created donation (populated with campaign title)
    await donation.populate("campaign", "title");
    return res.status(201).json(donation);
  } catch (err) {
    console.error("Create Donation Error:", err);
    return res.status(500).json({ message: "Failed to create donation." });
  }
});

export default router;
