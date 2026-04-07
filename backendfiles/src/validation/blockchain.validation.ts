import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const blockchainQuerySchema = paginationQuerySchema.extend({
  campaignId: objectIdSchema.optional(),
});

export const verifyBlockchainSchema = z.object({
  campaignId: objectIdSchema.optional(),
});

export const myTransparencyQuerySchema = z.object({
  campaignId: objectIdSchema.optional(),
});
