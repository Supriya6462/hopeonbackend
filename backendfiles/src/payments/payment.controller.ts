import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { paymentService } from "./payment.service";
import { sendResponse } from "../utils/sendResponse";
import { PaymentProvider } from "../types/enums";
import { PaymentFactory } from "./payment.factory";
import { Donation } from "../models/Donation.model";

export const initiatePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { donationId, returnUrl } = req.body;
    const provider: PaymentProvider | undefined = req.body?.provider;

    if (!donationId || !returnUrl) {
      return sendResponse(res, {
        statusCode: 400,
        message: "donationId and returnUrl are required",
      });
    }

    const result = await paymentService.initiate(req.user!._id.toString(), {
      donationId,
      returnUrl,
      provider,
    });

    sendResponse(res, {
      statusCode: 200,
      message: "Payment initiated successfully",
      data: { result },
    });
  },
);

export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { donationId, providerTransactionId } = req.body;

    if (!donationId) {
      return sendResponse(res, {
        statusCode: 400,
        message: "donationId is required",
      });
    }

    const result = await paymentService.verify(req.user!._id.toString(), {
      donationId,
      providerTransactionId,
    });

    sendResponse(res, {
      statusCode: 200,
      message: "Payment verified successfully",
      data: { result },
    });
  },
);

export const webhookHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const providerParam = req.params.provider as keyof typeof PaymentProvider;
    if (!providerParam || !(providerParam in PaymentProvider)) {
      return sendResponse(res, {
        statusCode: 400,
        message: "Invalid provider",
      });
    }
    const provider =
      PaymentProvider[providerParam as keyof typeof PaymentProvider];

    const providerTransactionId =
      req.body?.orderId ||
      req.body?.pidx ||
      req.body?.transaction_uuid ||
      req.body?.esewa_txn_uuid ||
      req.body?.transactionId ||
      req.query?.orderId ||
      req.query?.pidx;

    let donation = null as any;
    if (req.body?.donationId) {
      donation = await Donation.findById(req.body.donationId);
    } else if (providerTransactionId) {
      if (provider === PaymentProvider.PAYPAL) {
        donation = await Donation.findOne({
          $or: [
            { paypalOrderId: providerTransactionId },
            { transactionId: providerTransactionId },
          ],
        });
      } else if (provider === PaymentProvider.KHALTI) {
        donation = await Donation.findOne({
          $or: [
            { khaltiPidx: providerTransactionId },
            { transactionId: providerTransactionId },
          ],
        });
      } else if (provider === PaymentProvider.ESEWA) {
        donation = await Donation.findOne({
          $or: [
            { esewaTransactionUuid: providerTransactionId },
            { transactionId: providerTransactionId },
          ],
        });
      } else {
        donation = await Donation.findOne({
          transactionId: providerTransactionId,
        });
      }
    }

    if (!donation) {
      return sendResponse(res, {
        statusCode: 404,
        message: "Donation not found for webhook",
      });
    }

    const providerStrategy = PaymentFactory.create(provider);
    if (typeof (providerStrategy as any).validateWebhook === "function") {
      const ok = await (providerStrategy as any).validateWebhook(req);
      if (!ok) {
        return sendResponse(res, {
          statusCode: 401,
          message: "Webhook validation failed",
        });
      }
    }

    await paymentService.verifyByDonation(
      donation._id.toString(),
      providerTransactionId,
      provider,
    );

    return sendResponse(res, { statusCode: 200, message: "Webhook processed" });
  },
);
