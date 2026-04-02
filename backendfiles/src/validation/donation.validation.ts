import { z } from "zod";
import { DonationStatus, PaymentProvider } from "../types/enums.js";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const donationIdParamSchema = z.object({
  id: objectIdSchema,
});

export const campaignIdParamSchema = z.object({
  campaignId: objectIdSchema,
});

export const createDonationSchema = z.object({
  campaign: objectIdSchema,
  amount: z.number().positive(),
  method: z.literal(PaymentProvider.PAYPAL),
  donorEmail: z.string().trim().email(),
  transactionId: z.string().trim().min(1).optional(),
  isAnonymous: z.boolean().optional(),
  paypalOrderId: z.string().trim().min(1).optional(),
  payerEmail: z.string().trim().email().optional(),
  payerName: z.string().trim().min(1).optional(),
  payerCountry: z.string().trim().min(2).max(64).optional(),
});

export const updateDonationStatusSchema = z.object({
  status: z.enum([
    DonationStatus.PENDING,
    DonationStatus.COMPLETED,
    DonationStatus.FAILED,
  ]),
});

export const donationListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(DonationStatus).optional(),
  method: z.nativeEnum(PaymentProvider).optional(),
  campaign: objectIdSchema.optional(),
});
