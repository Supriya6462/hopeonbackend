import { beforeEach, describe, expect, it, vi } from "vitest";
import { withdrawalService } from "./withdrawal.service";

const { findByIdMock, findMock, countDocumentsMock } = vi.hoisted(() => ({
  findByIdMock: vi.fn(),
  findMock: vi.fn(),
  countDocumentsMock: vi.fn(),
}));

vi.mock("../models/WithdrawalRequest.model.js", () => ({
  WithdrawalRequest: {
    findById: findByIdMock,
    find: findMock,
    countDocuments: countDocumentsMock,
  },
}));

const { createInAppNotificationMock, notifyCampaignDonorsInAppMock } =
  vi.hoisted(() => ({
    createInAppNotificationMock: vi.fn(),
    notifyCampaignDonorsInAppMock: vi
      .fn()
      .mockResolvedValue({ notifiedCount: 0 }),
  }));

vi.mock("../services/notification.service.js", () => ({
  createInAppNotification: createInAppNotificationMock,
  notifyCampaignDonorsInApp: notifyCampaignDonorsInAppMock,
  NotificationEventType: { WITHDRAWAL_APPROVED: "withdrawal_approved" },
}));

const { sendWithdrawalStatusEmailMock } = vi.hoisted(() => ({
  sendWithdrawalStatusEmailMock: vi.fn(),
}));

vi.mock("../mail/mail.service.js", () => ({
  mailService: {
    sendWithdrawalStatusEmail: sendWithdrawalStatusEmailMock,
  },
}));

const { recordPayoutBlockMock } = vi.hoisted(() => ({
  recordPayoutBlockMock: vi.fn().mockResolvedValue({ hash: "block-hash" }),
}));

vi.mock("../services/blockchain.service.js", () => ({
  recordPayoutBlock: recordPayoutBlockMock,
}));

vi.mock("../models/Campaign.model.js", () => ({
  Campaign: {
    findById: vi.fn().mockResolvedValue({ title: "Test Campaign" }),
  },
}));

vi.mock("../models/User.model.js", () => ({
  User: {
    findById: vi
      .fn()
      .mockResolvedValue({ name: "Organizer", email: "org@example.com" }),
  },
}));

import mongoose from "mongoose";

function makeWithdrawalDoc(overrides: any = {}) {
  const base: any = {
    _id: "w-1",
    status: "pending",
    documents: {
      governmentId: { verified: false },
      bankProof: { verified: false },
      addressProof: { verified: false },
    },
    organizer: "org-1",
    campaign: "camp-1",
    amount: 100,
    save: vi.fn().mockResolvedValue(true),
  };

  return Object.assign(base, overrides);
}

describe("withdrawal.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ensure mongoose.startSession is stubbed to avoid real DB transactions in unit tests
    vi.spyOn(mongoose, "startSession").mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    } as any);
  });

  it("throws when approving without verified documents", async () => {
    const doc = makeWithdrawalDoc({ status: "pending" });
    findByIdMock.mockResolvedValueOnce(doc);

    await expect(
      withdrawalService.approveWithdrawal("w-1", "admin-1"),
    ).rejects.toThrow();

    expect(findByIdMock).toHaveBeenCalled();
  });

  it("approves when documents are verified", async () => {
    const doc = makeWithdrawalDoc({ status: "pending" });
    // First call: findById returns document instance
    findByIdMock.mockResolvedValueOnce(doc);
    // Second call: populate after save returns populated object
    findByIdMock.mockResolvedValueOnce({
      _id: "w-1",
      campaign: { title: "Test Campaign" },
      organizer: { name: "Org", email: "org@example.com" },
    });

    // ensure hasRequiredDocumentsVerified becomes true
    doc.documents.governmentId.verified = true;
    doc.documents.bankProof.verified = true;
    doc.documents.addressProof.verified = true;

    const result = await withdrawalService.approveWithdrawal("w-1", "admin-1");

    expect(result.status).toBe("approved");
    expect(doc.save).toHaveBeenCalled();
    expect(createInAppNotificationMock).toHaveBeenCalled();
    expect(sendWithdrawalStatusEmailMock).toHaveBeenCalled();
  });

  it("verifies a document", async () => {
    const doc = makeWithdrawalDoc();
    findByIdMock.mockResolvedValueOnce(doc);

    const res = await withdrawalService.verifyWithdrawalDocument(
      "w-1",
      "governmentId",
      true,
      "admin-1",
    );

    expect(res.status).toBeUndefined();
    expect(doc.documents.governmentId.verified).toBe(true);
    expect(doc.save).toHaveBeenCalled();
  });

  it("marks a withdrawal as paid", async () => {
    const doc = makeWithdrawalDoc({ status: "approved" });
    // first findById (session query) returns object with session(fn) that resolves to the doc
    findByIdMock.mockReturnValueOnce({
      session: vi.fn().mockResolvedValue(doc),
    } as any);
    // subsequent calls: for populate after save
    findByIdMock.mockResolvedValueOnce(doc);

    const result = await withdrawalService.markAsPaid(
      "w-1",
      "admin-1",
      "TX-123",
    );

    expect(recordPayoutBlockMock).toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(doc.save).toHaveBeenCalled();
  });
});
