import Campaign from "../Models/Campaign.js";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function calculateRemainingAmount(campaign) {
  const target = toNumber(campaign?.target);
  const raised = toNumber(campaign?.raised);

  if (Number.isNaN(target) || Number.isNaN(raised)) {
    return 0;
  }

  return Math.max(0, target - raised);
}

export async function tryIncrementCampaignRaisedWithinTarget({
  campaignId,
  amount,
}) {
  const parsedAmount = toNumber(amount);
  if (!campaignId || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      ok: false,
      code: "invalid_amount",
      status: 400,
      message: "Amount must be a positive number.",
    };
  }

  const updateResult = await Campaign.updateOne(
    {
      _id: campaignId,
      status: "active",
      isDonationEnabled: { $ne: false },
      $expr: {
        $gte: [
          {
            $subtract: [
              { $ifNull: ["$target", 0] },
              { $ifNull: ["$raised", 0] },
            ],
          },
          parsedAmount,
        ],
      },
    },
    { $inc: { raised: parsedAmount } },
  );

  if (updateResult.modifiedCount === 1) {
    return {
      ok: true,
      amount: parsedAmount,
    };
  }

  const campaign = await Campaign.findById(campaignId)
    .select("target raised status isDonationEnabled")
    .lean();

  if (!campaign) {
    return {
      ok: false,
      code: "campaign_not_found",
      status: 404,
      message: "Campaign not found",
    };
  }

  if (campaign.status !== "active" || campaign.isDonationEnabled === false) {
    return {
      ok: false,
      code: "campaign_not_accepting",
      status: 400,
      message: "This campaign is no longer accepting donations.",
    };
  }

  const remainingAmount = calculateRemainingAmount(campaign);
  if (remainingAmount <= 0) {
    return {
      ok: false,
      code: "campaign_target_reached",
      status: 409,
      message: "This campaign has already reached its target amount.",
      remainingAmount,
    };
  }

  if (parsedAmount > remainingAmount) {
    return {
      ok: false,
      code: "donation_exceeds_remaining",
      status: 409,
      message: "Donation amount exceeds the remaining campaign target.",
      remainingAmount,
    };
  }

  return {
    ok: false,
    code: "campaign_update_failed",
    status: 409,
    message: "Could not update campaign donation total.",
    remainingAmount,
  };
}

export function getCampaignRemainingAmount(campaign) {
  return calculateRemainingAmount(campaign);
}
