import test from "node:test";
import assert from "node:assert/strict";

import WithdrawalRequest from "../Models/WithdrawalRequest.js";
import * as adminWithdrawalsService from "../services/adminWithdrawalsService.js";

test("listWithdrawalRequests rejects invalid status filter", async () => {
  const result = await adminWithdrawalsService.listWithdrawalRequests({
    status: "processing",
    page: 1,
    limit: 20,
  });

  assert.equal(result.status, 400);
  assert.equal(result.message, "Invalid status filter");
});

test("updateWithdrawalStatus rejects invalid transitions", async () => {
  const originalFindById = WithdrawalRequest.findById;

  const fakeWithdrawalRequest = {
    _id: "wr-1",
    status: "pending",
    organizer: { _id: "org-1", email: "org@example.com", name: "Org" },
    campaign: { title: "Campaign A" },
    populate() {
      return this;
    },
    save: async () => {
      throw new Error("save should not be called");
    },
  };

  WithdrawalRequest.findById = () => fakeWithdrawalRequest;

  try {
    const result = await adminWithdrawalsService.updateWithdrawalStatus({
      withdrawalRequestId: "wr-1",
      adminUserId: "admin-1",
      status: "completed",
      reviewNotes: "",
      rejectionReason: "",
      transactionReference: "TX-1",
    });

    assert.equal(result.status, 400);
    assert.match(result.message, /Invalid status transition/);
  } finally {
    WithdrawalRequest.findById = originalFindById;
  }
});

test("updateWithdrawalStatus requires rejection reason", async () => {
  const originalFindById = WithdrawalRequest.findById;

  const fakeWithdrawalRequest = {
    _id: "wr-2",
    status: "pending",
    organizer: { _id: "org-1", email: "org@example.com", name: "Org" },
    campaign: { title: "Campaign A" },
    populate() {
      return this;
    },
    save: async () => {
      throw new Error("save should not be called");
    },
  };

  WithdrawalRequest.findById = () => fakeWithdrawalRequest;

  try {
    const result = await adminWithdrawalsService.updateWithdrawalStatus({
      withdrawalRequestId: "wr-2",
      adminUserId: "admin-1",
      status: "rejected",
      reviewNotes: "",
      rejectionReason: "   ",
      transactionReference: "",
    });

    assert.equal(result.status, 400);
    assert.equal(result.message, "Rejection reason is required");
  } finally {
    WithdrawalRequest.findById = originalFindById;
  }
});

test("updateWithdrawalStatus requires transaction reference when completing", async () => {
  const originalFindById = WithdrawalRequest.findById;

  const fakeWithdrawalRequest = {
    _id: "wr-3",
    status: "approved",
    organizer: { _id: "org-1", email: "org@example.com", name: "Org" },
    campaign: { title: "Campaign A" },
    populate() {
      return this;
    },
    save: async () => {
      throw new Error("save should not be called");
    },
  };

  WithdrawalRequest.findById = () => fakeWithdrawalRequest;

  try {
    const result = await adminWithdrawalsService.updateWithdrawalStatus({
      withdrawalRequestId: "wr-3",
      adminUserId: "admin-1",
      status: "completed",
      reviewNotes: "",
      rejectionReason: "",
      transactionReference: "   ",
    });

    assert.equal(result.status, 400);
    assert.equal(result.message, "Transaction reference is required");
  } finally {
    WithdrawalRequest.findById = originalFindById;
  }
});
