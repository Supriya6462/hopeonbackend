import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { Role } from "../types/enums.js";
import {
  getBlockchainController,
  getMyDonationTransparencyController,
  verifyBlockchainController,
} from "./blockchain.controller.js";
import { validateBody, validateQuery } from "../validation/validate.js";
import {
  blockchainQuerySchema,
  myTransparencyQuerySchema,
  verifyBlockchainSchema,
} from "../validation/blockchain.validation.js";

const router = Router();

router.get(
  "/",
  authenticate,
  validateQuery(blockchainQuerySchema),
  getBlockchainController,
);

router.post(
  "/verify",
  authenticate,
  validateBody(verifyBlockchainSchema),
  verifyBlockchainController,
);

router.get(
  "/donations/transparency/me",
  authenticate,
  authorize(Role.DONOR),
  validateQuery(myTransparencyQuerySchema),
  getMyDonationTransparencyController,
);

export default router;
