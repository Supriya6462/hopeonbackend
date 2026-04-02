import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  Alluserlist,
  getProfile,
  login,
  logout,
  register,
  requestOTP,
  updateProfile,
  verifyOTP,
} from "./auth.controller.js";
import { Role } from "../types/enums.js";
import { validateBody } from "../validation/validate.js";
import {
  loginSchema,
  registerSchema,
  requestOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "../validation/auth.validation.js";

const router = Router();

// Public routes
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/request-otp", validateBody(requestOtpSchema), requestOTP);
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOTP);

// Protected routes

router.get("/alluserdata", authenticate, authorize(Role.ADMIN), Alluserlist);
router.get("/profile", authenticate, getProfile);
router.put(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  updateProfile,
);
router.post("/logout", authenticate, logout);
export default router;
