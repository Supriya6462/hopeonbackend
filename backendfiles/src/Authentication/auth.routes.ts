import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getProfile, login, logout, register, requestOTP, updateProfile, verifyOTP } from "./auth.controller.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyOTP);

// Protected routes
router.get(
  "/profile",
  authenticate,
  getProfile
);
router.put(
  "/profile",
  authenticate,
  updateProfile
);
router.post("/logout",authenticate,logout);
export default router;
