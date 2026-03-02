import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { paymentService } from "./payment.service";
import { sendResponse } from "../utils/sendResponse";

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { donationId, returnUrl } = req.body;

  if (!donationId || !returnUrl) {
    return sendResponse(res, {
      statusCode: 400,
      message: "donationId and returnUrl are required",
    });
  }

  const result = await paymentService.initiate(req.user!._id.toString(), {
    donationId,
    returnUrl,
  });

  sendResponse(res, {
    statusCode: 200,
    message: "Payment initiated successfully",
    data: { result },
  });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
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
});
