import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  initiatePayment,
  paymentStatus,
} from "../controllers/PaymentController.js";

const router = Router();

router.post(
  "/initiate-payment",
  requireAuth,
  requireRole("donor"),
  initiatePayment,
);

router.post("/payment-status", paymentStatus);

export default router;
