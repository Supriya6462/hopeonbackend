import { Request, Response } from "express";
import { donationService } from "../Donations/donation.service.js";
import { paymentService } from "./payment.service.js";
import { Donation } from "../models/Donation.model.js";
import { PaymentProvider } from "../types/enums.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

function buildDefaultReturnUrl() {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl.replace(/\/+$/, "")}/donate/success`;
}

export const getPayPalConfig = (_req: Request, res: Response) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      error: "PayPal configuration not found on server",
    });
  }

  return res.json({ clientId });
};

export const createPayPalOrder = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { campaignId, amount, isAnonymous, returnUrl } = req.body as {
    campaignId?: string;
    amount?: number;
    isAnonymous?: boolean;
    returnUrl?: string;
  };

  if (!campaignId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const donation = await donationService.createDonation(
    req.user._id.toString(),
    {
      campaign: campaignId,
      amount: Number(amount),
      method: PaymentProvider.PAYPAL,
      donorEmail: req.user.email,
      isAnonymous: Boolean(isAnonymous),
    },
  );

  const paymentInit = await paymentService.initiate(req.user._id.toString(), {
    donationId: donation._id.toString(),
    returnUrl: returnUrl || buildDefaultReturnUrl(),
  });

  const orderID = paymentInit?.formData?.orderId;

  if (!orderID) {
    return res.status(502).json({
      error: "Could not create PayPal order.",
    });
  }

  return res.json({ orderID, donationId: donation._id });
};

export const capturePayPalOrder = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { orderID } = req.body as { orderID?: string };

  if (!orderID) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const donation = await Donation.findOne({
    donor: req.user._id,
    $or: [{ paypalOrderId: orderID }, { transactionId: orderID }],
  }).populate("campaign", "title");

  if (!donation) {
    return res.status(404).json({ error: "Donation not found for this order" });
  }

  await paymentService.verify(req.user._id.toString(), {
    donationId: donation._id.toString(),
    providerTransactionId: orderID,
  });

  const updatedDonation = await Donation.findById(donation._id).populate(
    "campaign",
    "title",
  );

  const campaignTitle =
    updatedDonation &&
    updatedDonation.campaign &&
    typeof updatedDonation.campaign === "object"
      ? (updatedDonation.campaign as { title?: string }).title ||
        "Campaign Donation"
      : "Campaign Donation";

  const billReceipt = {
    donationId: updatedDonation?._id,
    campaignTitle,
    amount: updatedDonation?.amount,
    currency: "USD",
    transactionId: updatedDonation?.transactionId,
    payerName: updatedDonation?.payerName,
    payerEmail: updatedDonation?.payerEmail,
    timestamp: updatedDonation?.updatedAt,
  };

  return res.json({
    donationRecord: updatedDonation,
    billReceipt,
  });
};
