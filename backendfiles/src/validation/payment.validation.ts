import { z } from "zod";
import { objectIdSchema } from "./common.js";
import { PaymentProvider } from "../types/enums";

export const initiatePaymentSchema = z.object({
  donationId: objectIdSchema,
  returnUrl: z.string().trim().url(),
  provider: z.nativeEnum(PaymentProvider).optional(),
});

export const verifyPaymentSchema = z.object({
  donationId: objectIdSchema,
  providerTransactionId: z.string().trim().min(1).optional(),
});
