import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { initiatePayment, verifyPayment } from "./payment.controller";
import { validateBody } from "../validation/validate";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
} from "../validation/payment.validation";

const router = Router();

// Initiate payment
router.post(
  "/initiate",
  authenticate,
  validateBody(initiatePaymentSchema),
  initiatePayment,
);

// Verify payment
router.post(
  "/verify",
  authenticate,
  validateBody(verifyPaymentSchema),
  verifyPayment,
);

export default router;
