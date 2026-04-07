import { z } from "zod";
import { Role, ApplicationStatus, WithdrawalStatus } from "../types/enums.js";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const adminUserIdParamSchema = z.object({
  userId: objectIdSchema,
});

export const adminCampaignIdParamSchema = z.object({
  campaignId: objectIdSchema,
});

export const adminApplicationIdParamSchema = z.object({
  id: objectIdSchema,
});

export const adminWithdrawalIdParamSchema = z.object({
  id: objectIdSchema,
});

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(Role).optional(),
  search: z.string().trim().min(1).optional(),
});

export const adminUserStatusUpdateSchema = z
  .object({
    role: z.nativeEnum(Role).optional(),
    isOrganizerApproved: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.role !== undefined || input.isOrganizerApproved !== undefined,
    {
      message: "At least one field is required",
      path: ["role"],
    },
  );

export const adminCampaignListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
});

export const adminDonationsListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["COMPLETED", "PENDING", "FAILED"]).optional(),
});

export const adminActivitiesListQuerySchema = paginationQuerySchema.extend({
  activityType: z.string().trim().min(1).optional(),
  userId: objectIdSchema.optional(),
});

export const adminApplicationsListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ApplicationStatus).optional(),
});

export const adminApproveApplicationSchema = z.object({
  adminNotes: z.string().trim().max(1000).optional(),
});

export const adminRejectApplicationSchema = z.object({
  rejectionReason: z.string().trim().min(10).max(1000),
  adminNotes: z.string().trim().max(1000).optional(),
});

export const adminRevokeOrganizerSchema = z.object({
  revocationReason: z.string().trim().min(10).max(1000),
});

export const adminWithdrawalsListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(WithdrawalStatus).optional(),
  organizerId: objectIdSchema.optional(),
  campaignId: objectIdSchema.optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const adminUnderReviewWithdrawalSchema = z.object({
  reviewNotes: z.string().trim().max(1000).optional(),
});

export const adminRejectWithdrawalSchema = z.object({
  adminMessage: z.string().trim().min(3).max(1000),
});

export const adminCompleteWithdrawalSchema = z.object({
  paymentReference: z.string().trim().min(1),
});

export const adminWithdrawalAuditQuerySchema = paginationQuerySchema;

export const adminBulkUnderReviewWithdrawalSchema = z.object({
  withdrawalIds: z.array(objectIdSchema).min(1).max(100),
  reviewNotes: z.string().trim().max(1000).optional(),
});

export const adminBulkApproveWithdrawalSchema = z.object({
  withdrawalIds: z.array(objectIdSchema).min(1).max(100),
});

export const adminBulkRejectWithdrawalSchema = z.object({
  withdrawalIds: z.array(objectIdSchema).min(1).max(100),
  adminMessage: z.string().trim().min(3).max(1000),
});
