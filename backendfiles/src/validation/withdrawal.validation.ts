import { z } from "zod";
import { WithdrawalStatus } from "../types/enums.js";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

const bankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(2),
  bankName: z.string().trim().min(2),
  accountNumber: z.string().trim().min(4),
  accountType: z.enum(["savings", "checking", "business"]),
  routingNumber: z.string().trim().min(2).optional(),
  swiftCode: z.string().trim().min(2).optional(),
  iban: z.string().trim().min(2).optional(),
  bankAddress: z.string().trim().min(2).optional(),
  bankCountry: z.string().trim().min(2),
});

const documentSchema = z.object({
  url: z.string().trim().url(),
  type: z.string().trim().min(2),
  verified: z.boolean().optional(),
});

const kycSchema = z.object({
  fullLegalName: z.string().trim().min(2),
  dateOfBirth: z.coerce.date(),
  nationality: z.string().trim().min(2),
  address: z.object({
    street: z.string().trim().min(2),
    city: z.string().trim().min(2),
    state: z.string().trim().optional(),
    postalCode: z.string().trim().min(2),
    country: z.string().trim().min(2),
  }),
  phoneNumber: z.string().trim().min(7),
  taxId: z.string().trim().optional(),
});

export const withdrawalIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createWithdrawalSchema = z
  .object({
    campaign: objectIdSchema,
    amount: z.number().positive().optional(),
    amountRequested: z.number().positive().optional(),
    payoutMethod: z.string().trim().min(1),
    bankDetails: bankDetailsSchema,
    documents: z.object({
      governmentId: documentSchema,
      bankProof: documentSchema,
      addressProof: documentSchema,
      taxDocument: documentSchema.partial().optional(),
    }),
    kycInfo: kycSchema,
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((data) => !!(data.amount || data.amountRequested), {
    message: "Either amount or amountRequested is required",
    path: ["amount"],
  });

export const rejectWithdrawalSchema = z.object({
  adminMessage: z.string().trim().min(3).max(1000).optional(),
});

export const markPaidSchema = z.object({
  paymentReference: z.string().trim().min(1).optional(),
});

export const withdrawalListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(WithdrawalStatus).optional(),
});
