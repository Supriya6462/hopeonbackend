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
