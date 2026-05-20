import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentProvider, DonationStatus } from "../types/enums.js";

const { initiateMock, createMock } = vi.hoisted(() => ({
  initiateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("../models/Donation.model", () => ({
  Donation: {
    findById: vi.fn(),
  },
}));

vi.mock("./payment.factory", () => ({
  PaymentFactory: {
    create: createMock,
  },
}));

vi.mock("../services/notification.service.js", () => ({
  createInAppNotification: vi.fn(),
  NotificationEventType: {
    DONATION_COMPLETED: "donation_completed",
    DONATION_RECEIVED: "donation_received",
  },
}));

vi.mock("../services/blockchain.service.js", () => ({
  recordDonationBlock: vi.fn(),
}));

import { Donation } from "../models/Donation.model";
import { paymentService } from "./payment.service";

describe("payment.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the donation payment provider when initiating payment", async () => {
    const donation = {
      _id: { toString: () => "donation-1" },
      donor: { toString: () => "user-1" },
      amount: 25,
      method: PaymentProvider.ESEWA,
      status: DonationStatus.PENDING,
      save: vi.fn().mockResolvedValue(true),
    } as any;

    vi.mocked(Donation.findById).mockResolvedValueOnce(donation);
    createMock.mockReturnValue({
      initiate: initiateMock.mockResolvedValue({
        redirectUrl: "https://example.test/pay",
      }),
    });

    const result = await paymentService.initiate("user-1", {
      donationId: "donation-1",
      returnUrl: "https://frontend.test/return",
    });

    expect(createMock).toHaveBeenCalledWith(PaymentProvider.ESEWA);
    expect(initiateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        donationId: "donation-1",
        amount: 25,
        returnUrl: "https://frontend.test/return",
      }),
    );
    expect(result).toEqual({ redirectUrl: "https://example.test/pay" });
  });
});
