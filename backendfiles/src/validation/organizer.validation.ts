import { z } from "zod";
import { ApplicationStatus, OrganizationType } from "../types/enums.js";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const applicationIdParamSchema = z.object({
  applicationId: objectIdSchema,
});

export const organizerIdParamSchema = z.object({
  id: objectIdSchema,
});

export const submitApplicationSchema = z.object({
  organizationName: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(2000),
  contactEmail: z.string().trim().email().optional(),
  phoneNumber: z.string().trim().min(7).max(20).optional(),
  website: z.string().trim().url().optional(),
  organizationType: z.nativeEnum(OrganizationType).optional(),
  documents: z.unknown().optional(),
});

export const getApplicationsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ApplicationStatus).optional(),
});

export const approveApplicationSchema = z.object({
  adminNotes: z.string().trim().max(1000).optional(),
});

export const rejectApplicationSchema = z.object({
  rejectionReason: z.string().trim().min(10).max(1000),
  adminNotes: z.string().trim().max(1000).optional(),
});

export const revokeOrganizerSchema = z.object({
  revocationReason: z.string().trim().min(10).max(1000),
});

export const getOrganizersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["all", "active", "revoked", "pending"]).optional(),
});

const organizerProfileDocumentSchema = z.object({
  url: z.string().trim().url(),
  key: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1),
  source: z.string().trim().min(1).optional(),
});

const organizerBankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(2).max(150),
  bankName: z.string().trim().min(2).max(150),
  accountNumber: z.string().trim().min(4).max(64),
  routingNumber: z.string().trim().max(64).optional(),
  swiftCode: z.string().trim().max(64).optional(),
  iban: z.string().trim().max(64).optional(),
  accountType: z.enum(["savings", "checking", "business"]),
  bankAddress: z.string().trim().max(255).optional(),
  bankCountry: z.string().trim().min(2).max(100),
});

const organizerKycInfoSchema = z.object({
  fullLegalName: z.string().trim().min(2).max(200),
  dateOfBirth: z.coerce.date(),
  nationality: z.string().trim().min(2).max(100),
  address: z.object({
    street: z.string().trim().min(2).max(200),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().min(2).max(20),
    country: z.string().trim().min(2).max(100),
  }),
  phoneNumber: z.string().trim().min(7).max(25),
  taxId: z.string().trim().max(100).optional(),
});

export const organizerProfileUpsertSchema = z.object({
  bankDetails: organizerBankDetailsSchema,
  documents: z.object({
    governmentId: organizerProfileDocumentSchema.optional(),
    bankProof: organizerProfileDocumentSchema.optional(),
    addressProof: organizerProfileDocumentSchema.optional(),
    taxDocument: organizerProfileDocumentSchema.optional(),
  }),
  kycInfo: organizerKycInfoSchema,
});

export const organizerProfileVerifySchema = z.object({
  verificationStatus: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export const organizerProfilesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["pending", "verified", "rejected"]).optional(),
  search: z.string().trim().max(200).optional(),
});

export const resubmitApplicationSchema = z.object({
  organizationName: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(2000),
  contactEmail: z.string().trim().email().optional(),
  phoneNumber: z.string().trim().min(7).max(20).optional(),
  website: z.string().trim().url().optional(),
  organizationType: z.nativeEnum(OrganizationType).optional(),
});
