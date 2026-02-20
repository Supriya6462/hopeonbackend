import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { Alluserlist, getProfile, login, logout, register, requestOTP, updateProfile, verifyOTP } from "./auth.controller.js";
import { Role } from "../types/enums.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyOTP);

// Protected routes

router.get("/alluserdata",authenticate,authorize(Role.ADMIN),Alluserlist);
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
