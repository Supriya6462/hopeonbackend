import BlockchainBlock from "../Models/BlockchainBlock.js";
import Donation from "../Models/Donation.js";
import WithdrawalRequest from "../Models/WithdrawalRequest.js";
import Campaign from "../Models/Campaign.js";
import mongoose from "mongoose";
import { Block, Blockchain } from "../lib/blockchain.js";
import { tryIncrementCampaignRaisedWithinTarget } from "./donationCapacityService.js";

function toPublicBlock(block) {
  return {
    id: block._id,
    index: block.index,
    timestamp: block.timestamp,
    type: block.type,
    data: block.data,
    previousHash: block.previousHash,
    hash: block.hash,
  };
}

function toBlockchain(blocks) {
  return new Blockchain(
    blocks.map((block) => ({
      index: block.index,
      timestamp: block.timestamp,
      type: block.type,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
    })),
  );
}

async function getLastBlock() {
  return BlockchainBlock.findOne().sort({ index: -1 }).lean();
}

async function appendBlock({ type, data, timestamp }) {
  const previousBlock = await getLastBlock();

  const block = new Block({
    index: previousBlock ? previousBlock.index + 1 : 0,
    timestamp: timestamp || new Date().toISOString(),
    type,
    data,
    previousHash: previousBlock ? previousBlock.hash : "0",
  });

  const saved = await BlockchainBlock.create({
    index: block.index,
    timestamp: block.timestamp,
    type: block.type,
    data: block.data,
    previousHash: block.previousHash,
    hash: block.hash,
  });

  return toPublicBlock(saved.toObject());
}

function normalizeCampaignId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

async function enrichBlocksWithCampaignTitle(blocks) {
  const campaignIds = [
    ...new Set(
      blocks
        .map((block) => normalizeCampaignId(block.data?.campaignId))
        .filter(Boolean),
    ),
  ];

  const validCampaignIds = campaignIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );

  if (!validCampaignIds.length) {
    return blocks;
  }

  const campaigns = await Campaign.find({ _id: { $in: validCampaignIds } })
    .select("_id title")
    .lean();

  const titleById = new Map(
    campaigns.map((campaign) => [String(campaign._id), campaign.title]),
  );

  return blocks.map((block) => {
    const campaignId = normalizeCampaignId(block.data?.campaignId);
    if (!campaignId) {
      return block;
    }

    return {
      ...block,
      data: {
        ...block.data,
        campaignTitle:
          block.data?.campaignTitle || titleById.get(campaignId) || null,
      },
    };
  });
}

export async function recordDonationBlock({
  donorName,
  amount,
  campaignId,
  donationId,
  transactionId,
  donatedAt,
}) {
  return appendBlock({
    type: "DONATION",
    data: {
      donorName,
      amount,
      campaignId: normalizeCampaignId(campaignId),
      donationId: donationId ? String(donationId) : null,
      transactionId: transactionId || null,
      donatedAt: donatedAt || new Date().toISOString(),
    },
    timestamp: donatedAt || new Date().toISOString(),
  });
}

export async function recordPayoutBlock({
  amount,
  campaignId,
  paidDate,
  withdrawalRequestId,
  transactionReference,
}) {
  return appendBlock({
    type: "PAYOUT",
    data: {
      amount,
      campaignId: normalizeCampaignId(campaignId),
      paidDate: paidDate || new Date().toISOString(),
      withdrawalRequestId: withdrawalRequestId
        ? String(withdrawalRequestId)
        : null,
      transactionReference: transactionReference || null,
    },
    timestamp: paidDate || new Date().toISOString(),
  });
}

export async function getBlockchain({ campaignId } = {}) {
  const query = campaignId ? { "data.campaignId": String(campaignId) } : {};
  const rawBlocks = await BlockchainBlock.find(query).sort({ index: 1 }).lean();
  const blocks = await enrichBlocksWithCampaignTitle(rawBlocks);
  const chain = toBlockchain(blocks);

  return {
    blocks: blocks.map((block) => toPublicBlock(block)),
    isValid: chain.isChainValid(),
  };
}

export async function verifyChain({ campaignId } = {}) {
  return getBlockchain({ campaignId });
}

export async function simulateTampering({ campaignId, blockIndex } = {}) {
  const { blocks } = await getBlockchain({ campaignId });

  if (!blocks.length) {
    return {
      blocks,
      isValid: true,
      tamperedIndex: null,
      message: "No blocks found. Chain is valid.",
    };
  }

  const targetIndex =
    typeof blockIndex === "number" &&
    blockIndex >= 0 &&
    blockIndex < blocks.length
      ? blockIndex
      : Math.min(1, blocks.length - 1);

  const tamperedBlocks = blocks.map((block, idx) => {
    if (idx !== targetIndex) {
      return block;
    }

    return {
      ...block,
      data: {
        ...block.data,
        amount: Number(block.data?.amount || 0) + 1,
        tampered: true,
      },
    };
  });

  const chain = toBlockchain(tamperedBlocks);

  return {
    blocks: tamperedBlocks,
    isValid: chain.isChainValid(),
    tamperedIndex: targetIndex,
    message:
      "Tampering was simulated in memory only. Stored blockchain remains unchanged.",
  };
}

export async function getMyDonationTransparency({ donorEmail, campaignId }) {
  const donationQuery = { donorEmail };
  if (campaignId) {
    donationQuery.campaign = campaignId;
  }

  const donations = await Donation.find(donationQuery)
    .populate("campaign", "title imageURL status endedAt isDonationEnabled")
    .sort({ createdAt: -1 })
    .lean();

  const campaignIds = [
    ...new Set(
      donations
        .map((donation) =>
          normalizeCampaignId(donation.campaign?._id || donation.campaign),
        )
        .filter(Boolean),
    ),
  ];

  const [payoutBlocks, donationBlocks] = await Promise.all([
    BlockchainBlock.find({
      type: "PAYOUT",
      ...(campaignIds.length
        ? { "data.campaignId": { $in: campaignIds } }
        : {}),
    })
      .sort({ index: 1 })
      .lean(),
    BlockchainBlock.find({
      type: "DONATION",
      ...(campaignIds.length
        ? { "data.campaignId": { $in: campaignIds } }
        : {}),
    })
      .sort({ index: 1 })
      .lean(),
  ]);

  const latestPayoutByCampaign = new Map();
  payoutBlocks.forEach((block) => {
    const payoutCampaignId = normalizeCampaignId(block.data?.campaignId);
    if (!payoutCampaignId) {
      return;
    }

    latestPayoutByCampaign.set(payoutCampaignId, block);
  });

  const donationBlockByDonationId = new Map();
  const donationBlockByTransactionId = new Map();

  donationBlocks.forEach((block) => {
    const donationId = block.data?.donationId
      ? String(block.data.donationId)
      : null;
    const txId = block.data?.transactionId || null;

    if (donationId) {
      donationBlockByDonationId.set(donationId, block);
    }

    if (txId) {
      donationBlockByTransactionId.set(String(txId), block);
    }
  });

  const enriched = donations.map((donation) => {
    const donationCampaignId = normalizeCampaignId(
      donation.campaign?._id || donation.campaign,
    );
    const payoutBlock = latestPayoutByCampaign.get(donationCampaignId) || null;
    const donationBlock =
      donationBlockByDonationId.get(String(donation._id)) ||
      donationBlockByTransactionId.get(String(donation.transactionId || "")) ||
      null;
    const donationHash = donationBlock?.hash || donation.transactionId || null;
    const payoutHash = payoutBlock?.hash || null;

    return {
      ...donation,
      transactionHash: donationHash,
      payoutStatus: payoutBlock ? "Paid Out" : "Pending",
      payoutDate: payoutBlock
        ? payoutBlock.data?.paidDate || payoutBlock.timestamp
        : null,
      payoutTransactionHash: payoutHash,
      traceability: {
        donationHash,
        payoutHash,
        isLinked: Boolean(payoutHash),
      },
    };
  });

  return enriched;
}

export async function createManualDonationAndBlock({
  user,
  campaignId,
  amount,
  donorName,
}) {
  const incrementResult = await tryIncrementCampaignRaisedWithinTarget({
    campaignId,
    amount,
  });

  if (!incrementResult.ok) {
    return {
      status: incrementResult.status,
      message: incrementResult.message,
      code: incrementResult.code,
      remainingAmount: incrementResult.remainingAmount,
    };
  }

  const transactionId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let donation;
  try {
    donation = await Donation.create({
      campaign: campaignId,
      donor: user.userId,
      donorEmail: user.email,
      isAnonymous: false,
      amount: incrementResult.amount,
      method: "paypal",
      transactionId,
      status: "COMPLETED",
      payerEmail: user.email,
      payerName: donorName || user.name || "Anonymous Donor",
      captureDetails: {
        source: "manual-api",
        note: "Academic blockchain-inspired transparency demo flow",
      },
    });
  } catch (donationError) {
    await Campaign.updateOne(
      { _id: campaignId },
      { $inc: { raised: -incrementResult.amount } },
    );
    throw donationError;
  }

  const block = await recordDonationBlock({
    donorName: donorName || user.name || "Anonymous Donor",
    amount: incrementResult.amount,
    campaignId,
    donationId: donation._id,
    transactionId,
    donatedAt: donation.createdAt.toISOString(),
  });

  return {
    donation,
    transactionHash: block.hash,
    block,
  };
}

export async function recordPayoutFromWithdrawal({
  withdrawalRequestId,
  paidDate,
  amount,
  campaignId,
  transactionReference,
}) {
  let resolvedAmount = amount;
  let resolvedCampaignId = campaignId;
  let resolvedPaidDate = paidDate;

  if (withdrawalRequestId) {
    const withdrawalRequest = await WithdrawalRequest.findById(
      withdrawalRequestId,
    )
      .populate("campaign", "_id")
      .lean();

    if (!withdrawalRequest) {
      return { status: 404, message: "Withdrawal request not found" };
    }

    resolvedAmount = resolvedAmount ?? withdrawalRequest.amount;
    resolvedCampaignId =
      resolvedCampaignId ??
      withdrawalRequest.campaign?._id ??
      withdrawalRequest.campaign;
    resolvedPaidDate =
      resolvedPaidDate ??
      (withdrawalRequest.completedAt
        ? new Date(withdrawalRequest.completedAt).toISOString()
        : new Date().toISOString());
  }

  if (!resolvedAmount || Number(resolvedAmount) <= 0) {
    return { status: 400, message: "A positive payout amount is required." };
  }

  if (!resolvedCampaignId) {
    return { status: 400, message: "campaignId is required." };
  }

  const block = await recordPayoutBlock({
    amount: Number(resolvedAmount),
    campaignId: resolvedCampaignId,
    paidDate: resolvedPaidDate || new Date().toISOString(),
    withdrawalRequestId,
    transactionReference,
  });

  return {
    transactionHash: block.hash,
    block,
  };
}
