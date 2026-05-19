import test from "node:test";
import assert from "node:assert/strict";

import Campaign from "../Models/Campaign.js";
import {
  getCampaignRemainingAmount,
  tryIncrementCampaignRaisedWithinTarget,
} from "../services/donationCapacityService.js";

test("getCampaignRemainingAmount calculates remaining safely", () => {
  assert.equal(getCampaignRemainingAmount({ target: 3000, raised: 1200 }), 1800);
  assert.equal(getCampaignRemainingAmount({ target: 3000, raised: 3200 }), 0);
  assert.equal(getCampaignRemainingAmount({ target: "bad", raised: 10 }), 0);
});

test("tryIncrementCampaignRaisedWithinTarget succeeds when atomic update modifies one document", async () => {
  const originalUpdateOne = Campaign.updateOne;

  Campaign.updateOne = async () => ({ modifiedCount: 1 });

  try {
    const result = await tryIncrementCampaignRaisedWithinTarget({
      campaignId: "cmp-1",
      amount: 75,
    });

    assert.equal(result.ok, true);
    assert.equal(result.amount, 75);
  } finally {
    Campaign.updateOne = originalUpdateOne;
  }
});

test("tryIncrementCampaignRaisedWithinTarget rejects when amount exceeds remaining", async () => {
  const originalUpdateOne = Campaign.updateOne;
  const originalFindById = Campaign.findById;

  Campaign.updateOne = async () => ({ modifiedCount: 0 });
  Campaign.findById = () => ({
    select: () => ({
      lean: async () => ({
        target: 3000,
        raised: 2500,
        status: "active",
        isDonationEnabled: true,
      }),
    }),
  });

  try {
    const result = await tryIncrementCampaignRaisedWithinTarget({
      campaignId: "cmp-1",
      amount: 800,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "donation_exceeds_remaining");
    assert.equal(result.status, 409);
    assert.equal(result.remainingAmount, 500);
  } finally {
    Campaign.updateOne = originalUpdateOne;
    Campaign.findById = originalFindById;
  }
});

test("tryIncrementCampaignRaisedWithinTarget reports target reached", async () => {
  const originalUpdateOne = Campaign.updateOne;
  const originalFindById = Campaign.findById;

  Campaign.updateOne = async () => ({ modifiedCount: 0 });
  Campaign.findById = () => ({
    select: () => ({
      lean: async () => ({
        target: 3000,
        raised: 3000,
        status: "active",
        isDonationEnabled: true,
      }),
    }),
  });

  try {
    const result = await tryIncrementCampaignRaisedWithinTarget({
      campaignId: "cmp-1",
      amount: 1,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "campaign_target_reached");
    assert.equal(result.status, 409);
  } finally {
    Campaign.updateOne = originalUpdateOne;
    Campaign.findById = originalFindById;
  }
});

test("tryIncrementCampaignRaisedWithinTarget reports campaign not found", async () => {
  const originalUpdateOne = Campaign.updateOne;
  const originalFindById = Campaign.findById;

  Campaign.updateOne = async () => ({ modifiedCount: 0 });
  Campaign.findById = () => ({
    select: () => ({
      lean: async () => null,
    }),
  });

  try {
    const result = await tryIncrementCampaignRaisedWithinTarget({
      campaignId: "cmp-missing",
      amount: 25,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "campaign_not_found");
    assert.equal(result.status, 404);
  } finally {
    Campaign.updateOne = originalUpdateOne;
    Campaign.findById = originalFindById;
  }
});
