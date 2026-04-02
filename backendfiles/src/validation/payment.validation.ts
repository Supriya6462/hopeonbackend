import { z } from "zod";
import { objectIdSchema } from "./common.js";

export const initiatePaymentSchema = z.object({
  donationId: objectIdSchema,
  returnUrl: z.string().trim().url(),
});

export const verifyPaymentSchema = z.object({
  donationId: objectIdSchema,
  providerTransactionId: z.string().trim().min(1).optional(),
});
