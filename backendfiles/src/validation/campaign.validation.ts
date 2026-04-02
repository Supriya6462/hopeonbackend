import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const campaignIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createCampaignSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10),
  imageURL: z.string().trim().url().optional(),
  images: z.array(z.string().trim().url()).optional(),
  target: z.number().positive(),
});

export const updateCampaignSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().min(10).optional(),
    imageURL: z.string().trim().url().optional(),
    images: z.array(z.string().trim().url()).optional(),
    target: z.number().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const campaignQuerySchema = paginationQuerySchema.extend({
  owner: objectIdSchema.optional(),
  isApproved: z.enum(["true", "false"]).optional(),
  isClosed: z.enum(["true", "false"]).optional(),
});
