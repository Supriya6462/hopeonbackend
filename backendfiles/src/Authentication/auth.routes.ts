import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  Alluserlist,
  forgotPassword,
  getProfile,
  login,
  logout,
  me,
  register,
  resetPassword,
  requestOTP,
  updateProfile,
  verifyResetOtp,
  verifyOTP,
} from "./auth.controller.js";
import { Role } from "../types/enums.js";
import { validateBody } from "../validation/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  requestOtpSchema,
  updateProfileSchema,
  verifyResetOtpSchema,
  verifyOtpSchema,
} from "../validation/auth.validation.js";

const router = Router();

// Public routes
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/request-otp", validateBody(requestOtpSchema), requestOTP);
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOTP);
router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/verify-reset-otp",
  validateBody(verifyResetOtpSchema),
  verifyResetOtp,
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

// Protected routes

router.get("/alluserdata", authenticate, authorize(Role.ADMIN), Alluserlist);
router.get("/me", authenticate, me);
router.get("/profile", authenticate, getProfile);
router.put(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  updateProfile,
);
router.post("/logout", authenticate, logout);
export default router;
