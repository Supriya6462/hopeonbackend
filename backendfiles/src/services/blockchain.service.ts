import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { BlockchainBlock } from "../models/BlockchainBlock.model.js";
import { Donation } from "../models/Donation.model.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { ApiError } from "../utils/ApiError.js";

type BlockType = "DONATION" | "PAYOUT";

interface BlockPayload {
  index: number;
  timestamp: string;
  type: BlockType;
  data: Record<string, unknown>;
  previousHash: string;
}

interface PublicBlock extends BlockPayload {
  id: mongoose.Types.ObjectId | string;
  hash: string;
}

function normalizeCampaignId(value: unknown): string | null {
  if (!value) {
    return null;
  }

  return String(value);
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const keys = Object.keys(input).sort();
    const result: Record<string, unknown> = {};

    keys.forEach((key) => {
      result[key] = sortKeysDeep(input[key]);
    });

    return result;
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function buildHash(payload: BlockPayload): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function toPublicBlock(block: any): PublicBlock {
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

async function getLastBlock() {
  return BlockchainBlock.findOne().sort({ index: -1 }).lean();
}

async function appendBlock({
  type,
  data,
  timestamp,
}: {
  type: BlockType;
  data: Record<string, unknown>;
  timestamp?: string;
}) {
  const previousBlock = await getLastBlock();
  const payload: BlockPayload = {
    index: previousBlock ? previousBlock.index + 1 : 0,
    timestamp: timestamp || new Date().toISOString(),
    type,
    data,
    previousHash: previousBlock ? previousBlock.hash : "0",
  };

  const hash = buildHash(payload);

  const saved = await BlockchainBlock.create({
    ...payload,
    hash,
  });

  return toPublicBlock(saved.toObject());
}

function verifyIntegrity(blocks: any[]) {
  for (let idx = 0; idx < blocks.length; idx += 1) {
    const current = blocks[idx];
    const expectedPreviousHash = idx === 0 ? "0" : blocks[idx - 1].hash;

    if (current.previousHash !== expectedPreviousHash) {
      return false;
    }

    const expectedHash = buildHash({
      index: current.index,
      timestamp: current.timestamp,
      type: current.type,
      data: current.data,
      previousHash: current.previousHash,
    });

    if (current.hash !== expectedHash) {
      return false;
    }

    if (idx > 0 && current.index !== blocks[idx - 1].index + 1) {
      return false;
    }
  }

  return true;
}

async function enrichBlocksWithCampaignTitle(blocks: any[]) {
  const campaignIds = [
    ...new Set(
      blocks
        .map((block) => normalizeCampaignId(block.data?.campaignId))
        .filter(Boolean),
    ),
  ] as string[];

  if (!campaignIds.length) {
    return blocks;
  }

  const campaigns = await Campaign.find({ _id: { $in: campaignIds } })
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
}: {
  donorName: string;
  amount: number;
  campaignId: mongoose.Types.ObjectId | string;
  donationId: mongoose.Types.ObjectId | string;
  transactionId?: string | null;
  donatedAt?: string;
}) {
  if (!amount || amount <= 0) {
    throw new ApiError(
      "A positive donation amount is required.",
      400,
      "BLOCKCHAIN_INVALID_DONATION_AMOUNT",
    );
  }

  return appendBlock({
    type: "DONATION",
    data: {
      donorName,
      amount,
      campaignId: normalizeCampaignId(campaignId),
      donationId: String(donationId),
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
}: {
  amount: number;
  campaignId: mongoose.Types.ObjectId | string;
  paidDate?: string;
  withdrawalRequestId: mongoose.Types.ObjectId | string;
  transactionReference?: string;
}) {
  if (!amount || amount <= 0) {
    throw new ApiError(
      "A positive payout amount is required.",
      400,
      "BLOCKCHAIN_INVALID_PAYOUT_AMOUNT",
    );
  }

  return appendBlock({
    type: "PAYOUT",
    data: {
      amount,
      campaignId: normalizeCampaignId(campaignId),
      paidDate: paidDate || new Date().toISOString(),
      withdrawalRequestId: String(withdrawalRequestId),
      transactionReference: transactionReference || null,
    },
    timestamp: paidDate || new Date().toISOString(),
  });
}

export async function getBlockchain({
  campaignId,
}: { campaignId?: unknown } = {}) {
  const query = campaignId ? { "data.campaignId": String(campaignId) } : {};
  const rawBlocks = await BlockchainBlock.find(query).sort({ index: 1 }).lean();
  const blocks = await enrichBlocksWithCampaignTitle(rawBlocks);

  return {
    blocks: blocks.map((block) => toPublicBlock(block)),
    isValid: verifyIntegrity(blocks),
  };
}

export async function verifyChain({
  campaignId,
}: { campaignId?: unknown } = {}) {
  return getBlockchain({ campaignId });
}

export async function getMyDonationTransparency({
  donorEmail,
  campaignId,
}: {
  donorEmail: string;
  campaignId?: unknown;
}) {
  if (!donorEmail) {
    throw new ApiError(
      "donorEmail is required.",
      400,
      "BLOCKCHAIN_DONOR_EMAIL_REQUIRED",
    );
  }

  const donationQuery: Record<string, unknown> = { donorEmail };
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
          normalizeCampaignId(
            (donation as any).campaign?._id || donation.campaign,
          ),
        )
        .filter(Boolean),
    ),
  ] as string[];

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

  const latestPayoutByCampaign = new Map<string, any>();
  payoutBlocks.forEach((block) => {
    const payoutCampaignId = normalizeCampaignId(block.data?.campaignId);
    if (!payoutCampaignId) {
      return;
    }

    latestPayoutByCampaign.set(payoutCampaignId, block);
  });

  const donationBlockByDonationId = new Map<string, any>();
  const donationBlockByTransactionId = new Map<string, any>();

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

  return donations.map((donation) => {
    const donationCampaignId = normalizeCampaignId(
      (donation as any).campaign?._id || donation.campaign,
    );
    const payoutBlock = donationCampaignId
      ? latestPayoutByCampaign.get(donationCampaignId) || null
      : null;
    const donationBlock =
      donationBlockByDonationId.get(String(donation._id)) ||
      donationBlockByTransactionId.get(String(donation.transactionId || "")) ||
      null;

    const donationHash =
      donationBlock?.hash || (donation as any).blockchainHash || null;
    const payoutHash = payoutBlock?.hash || null;

    return {
      ...donation,
      transactionHash: donationHash,
      payoutStatus: payoutBlock ? "Paid Out" : "Pending",
      payoutDate: payoutBlock
        ? (payoutBlock.data?.paidDate as string) || payoutBlock.timestamp
        : null,
      payoutTransactionHash: payoutHash,
      traceability: {
        donationHash,
        payoutHash,
        isLinked: Boolean(payoutHash),
      },
    };
  });
}

export async function recordPayoutFromWithdrawal({
  withdrawalRequestId,
  paidDate,
  amount,
  campaignId,
  transactionReference,
}: {
  withdrawalRequestId?: string;
  paidDate?: string;
  amount?: number;
  campaignId?: string;
  transactionReference?: string;
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
      String(
        (withdrawalRequest as any).campaign?._id || withdrawalRequest.campaign,
      );
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
    withdrawalRequestId: withdrawalRequestId || "manual",
    transactionReference,
  });

  return {
    transactionHash: block.hash,
    block,
  };
}
