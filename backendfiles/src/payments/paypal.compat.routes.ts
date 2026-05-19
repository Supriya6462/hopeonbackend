import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { Role } from "../types/enums.js";
import {
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalConfig,
} from "./paypal.compat.controller.js";

const router = Router();

router.get("/config", getPayPalConfig);

router.post(
  "/create-order",
  authenticate,
  authorize(Role.DONOR, Role.ORGANIZER, Role.ADMIN),
  createPayPalOrder,
);

router.post(
  "/capture-order",
  authenticate,
  authorize(Role.DONOR, Role.ORGANIZER, Role.ADMIN),
  capturePayPalOrder,
);

export default router;
