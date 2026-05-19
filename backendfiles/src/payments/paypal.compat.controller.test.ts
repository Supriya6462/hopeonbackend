import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalConfig,
} from "./paypal.compat.controller.js";

const {
  createDonationMock,
  initiateMock,
  verifyMock,
  findOneMock,
  findByIdMock,
} = vi.hoisted(() => ({
  createDonationMock: vi.fn(),
  initiateMock: vi.fn(),
  verifyMock: vi.fn(),
  findOneMock: vi.fn(),
  findByIdMock: vi.fn(),
}));

vi.mock("../Donations/donation.service.js", () => ({
  donationService: {
    createDonation: createDonationMock,
  },
}));

vi.mock("./payment.service.js", () => ({
  paymentService: {
    initiate: initiateMock,
    verify: verifyMock,
  },
}));

vi.mock("../models/Donation.model.js", () => ({
  Donation: {
    findOne: findOneMock,
    findById: findByIdMock,
  },
}));

function createRes() {
  const json = vi.fn();
  const res = {
    status: vi.fn().mockReturnValue({ json }),
    json,
  };

  return res;
}

describe("paypal compatibility controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.PAYPAL_CLIENT_ID = "test-client-id";
  });

  it("returns paypal config when client id exists", () => {
    const res = createRes();

    getPayPalConfig({} as any, res as any);

    expect(res.json).toHaveBeenCalledWith({ clientId: "test-client-id" });
  });

  it("returns 500 when paypal client id is missing", () => {
    const res = createRes();
    delete process.env.PAYPAL_CLIENT_ID;

    getPayPalConfig({} as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("creates order from campaign and amount", async () => {
    const req = {
      user: {
        _id: { toString: () => "user-1" },
        email: "donor@example.com",
      },
      body: {
        campaignId: "507f191e810c19729de860ea",
        amount: 25,
      },
    } as any;
    const res = createRes();

    createDonationMock.mockResolvedValue({
      _id: { toString: () => "donation-1" },
    });
    initiateMock.mockResolvedValue({
      formData: { orderId: "ORDER-123" },
    });

    await createPayPalOrder(req, res as any);

    expect(createDonationMock).toHaveBeenCalledTimes(1);
    expect(initiateMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orderID: "ORDER-123",
        donationId: expect.anything(),
      }),
    );
  });

  it("returns 404 when capture order has no matching donation", async () => {
    const req = {
      user: { _id: { toString: () => "user-1" } },
      body: { orderID: "ORDER-404" },
    } as any;
    const res = createRes();

    findOneMock.mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    });

    await capturePayPalOrder(req, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("captures order and returns receipt", async () => {
    const req = {
      user: { _id: { toString: () => "user-1" } },
      body: { orderID: "ORDER-200" },
    } as any;
    const res = createRes();

    findOneMock.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        _id: { toString: () => "donation-1" },
        campaign: { title: "Test Campaign" },
      }),
    });

    findByIdMock.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        _id: "donation-1",
        amount: 25,
        transactionId: "ORDER-200",
        payerName: "Test User",
        payerEmail: "donor@example.com",
        updatedAt: new Date("2026-05-19T00:00:00.000Z"),
        campaign: { title: "Test Campaign" },
      }),
    });

    verifyMock.mockResolvedValue({ success: true });

    await capturePayPalOrder(req, res as any);

    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        donationRecord: expect.any(Object),
        billReceipt: expect.objectContaining({
          campaignTitle: "Test Campaign",
          transactionId: "ORDER-200",
        }),
      }),
    );
  });
});
