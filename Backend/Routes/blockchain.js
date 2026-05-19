import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createManualDonationAndBlock,
  getBlockchain,
  getMyDonationTransparency,
  recordPayoutFromWithdrawal,
  simulateTampering,
  verifyChain,
} from "../services/blockchainService.js";

const router = express.Router();

router.post("/donate", requireAuth, requireRole(["donor"]), async (req, res) => {
  try {
    const { donorName, amount, campaignId } = req.body;

    if (!campaignId || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "campaignId and a positive numeric amount are required.",
      });
    }

    const result = await createManualDonationAndBlock({
      user: req.user,
      campaignId,
      amount,
      donorName,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.status(201).json({
      message: "Donation recorded and added to transparency chain.",
      donation: result.donation,
      transactionHash: result.transactionHash,
      block: result.block,
    });
  } catch (error) {
    console.error("Blockchain donate route error:", error);
    return res.status(500).json({ message: "Failed to process donation." });
  }
});

router.post("/payout", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const { amount, campaignId, paidDate, withdrawalRequestId, transactionReference } = req.body;

    const result = await recordPayoutFromWithdrawal({
      amount,
      campaignId,
      paidDate,
      withdrawalRequestId,
      transactionReference,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.status(201).json({
      message: "Payout recorded and added to transparency chain.",
      transactionHash: result.transactionHash,
      block: result.block,
    });
  } catch (error) {
    console.error("Blockchain payout route error:", error);
    return res.status(500).json({ message: "Failed to record payout." });
  }
});

router.get("/blockchain", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.query;
    const result = await getBlockchain({ campaignId });

    return res.json({
      blocks: result.blocks,
      isValid: result.isValid,
      totalBlocks: result.blocks.length,
    });
  } catch (error) {
    console.error("Blockchain list route error:", error);
    return res.status(500).json({ message: "Failed to fetch blockchain." });
  }
});

router.post("/blockchain/verify", requireAuth, async (req, res) => {
  try {
    const campaignId = req.body?.campaignId || req.query?.campaignId;
    const result = await verifyChain({ campaignId });

    return res.json({
      isValid: result.isValid,
      totalBlocks: result.blocks.length,
      blocks: result.blocks,
    });
  } catch (error) {
    console.error("Blockchain verify route error:", error);
    return res.status(500).json({ message: "Failed to verify blockchain." });
  }
});

router.post("/blockchain/simulate-tampering", requireAuth, async (req, res) => {
  try {
    const { campaignId, blockIndex } = req.body || {};
    const parsedIndex =
      typeof blockIndex === "number" ? blockIndex : Number.parseInt(blockIndex, 10);

    const result = await simulateTampering({
      campaignId,
      blockIndex: Number.isNaN(parsedIndex) ? undefined : parsedIndex,
    });

    return res.json(result);
  } catch (error) {
    console.error("Blockchain tamper simulation route error:", error);
    return res.status(500).json({ message: "Failed to simulate tampering." });
  }
});

router.get(
  "/donations/transparency/me",
  requireAuth,
  requireRole(["donor"]),
  async (req, res) => {
    try {
      const { campaignId } = req.query;
      const donations = await getMyDonationTransparency({
        donorEmail: req.user.email,
        campaignId,
      });

      return res.json({ donations });
    } catch (error) {
      console.error("Donation transparency route error:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch donation transparency." });
    }
  },
);

export default router;
