import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { initiatePayment, verifyPayment } from "./payment.controller";

const router = Router();

// Initiate payment
router.post("/initiate", authenticate, initiatePayment);

// Verify payment
router.post("/verify", authenticate, verifyPayment);

export default router;
