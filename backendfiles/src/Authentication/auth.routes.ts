import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post("/request-otp", authController.requestOTP.bind(authController));
router.post("/verify-otp", authController.verifyOTP.bind(authController));

// Protected routes
router.get(
  "/profile",
  authenticate,
  authController.getProfile.bind(authController)
);
router.put(
  "/profile",
  authenticate,
  authController.updateProfile.bind(authController)
);

export default router;
