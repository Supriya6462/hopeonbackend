import { Router } from "express";
import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";
import { strictRateLimiter } from "../middleware/rateLimiter.js";
import OrganizerApplication from "../Models/OrganizerApplication.js";
import Otp from "../Models/Otp.js";
import {
  sanitizeString,
  isValidEmail,
  getEmailDomain,
  validateEmailForOtp,
  isValidAmount,
} from "../utils/validation.js";
import { logError, logSecurityEvent, logInfo } from "../utils/logger.js";
import { sendOtpEmail } from "../services/emailService.js";

const router = Router();
const registerOtpCooldownStore = new Map();
const forgotOtpCooldownStore = new Map();
const REGISTER_OTP_COOLDOWN_MS = Number(
  process.env.REGISTER_OTP_COOLDOWN_MS || 60_000,
);
const FORGOT_OTP_COOLDOWN_MS = Number(
  process.env.FORGOT_OTP_COOLDOWN_MS || 60_000,
);

function getOtpCooldownRemainingMs(store, email, cooldownMs) {
  const lastSentAt = store.get(email);
  if (!lastSentAt) return 0;

  const elapsed = Date.now() - lastSentAt;
  if (elapsed >= cooldownMs) {
    store.delete(email);
    return 0;
  }

  return cooldownMs - elapsed;
}

/**
 * POST /api/auth/register
 * Step 1: Send OTP to email for verification
 */
router.post("/register", strictRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email).toLowerCase();
    const sanitizedName = sanitizeString(name);

    const emailValidation = await validateEmailForOtp(sanitizedEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        message: emailValidation.message,
        code: emailValidation.code,
      });
    }

    if (emailValidation.isUncertain) {
      logInfo("Email domain DNS check uncertain; allowing OTP fallback", {
        emailDomain: getEmailDomain(sanitizedEmail),
        reason: emailValidation.code,
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        message: "Password must contain uppercase, lowercase, and numbers.",
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: sanitizedEmail });
    if (existing) {
      logSecurityEvent("Registration attempt with existing email", {
        emailDomain: getEmailDomain(sanitizedEmail),
      });
      return res
        .status(409)
        .json({ message: "Email already in use.", code: "EMAIL_ALREADY_IN_USE" });
    }

    // Check if email service is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logError("Email service not configured");
      return res.status(500).json({
        message: "Email service not configured.",
        code: "EMAIL_SERVICE_NOT_CONFIGURED",
      });
    }

    const cooldownRemainingMs = getOtpCooldownRemainingMs(
      registerOtpCooldownStore,
      sanitizedEmail,
      REGISTER_OTP_COOLDOWN_MS,
    );
    if (cooldownRemainingMs > 0) {
      const retryAfterSeconds = Math.ceil(cooldownRemainingMs / 1000);
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds}s before requesting another OTP.`,
        code: "OTP_REQUEST_COOLDOWN",
        retryAfterSeconds,
      });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    const sendResult = await sendOtpEmail({
      to: sanitizedEmail,
      subject: "OTP code for registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Fundraising Platform!</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${otpCode}</h1>
          <p>This code will expire in 3 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (!sendResult.ok) {
      logError("Register Email Send Error", sendResult.error, {
        emailDomain: getEmailDomain(sanitizedEmail),
      });

      return res.status(503).json({
        message: sendResult.message,
        code: sendResult.code,
      });
    }

    // Persist OTP only after successful send to avoid orphan OTP records.
    await Otp.findOneAndUpdate(
      { email: sanitizedEmail, purpose: "register" },
      {
        email: sanitizedEmail,
        otpCode,
        purpose: "register",
        expiresAt,
        isUsed: false,
      },
      { upsert: true, new: true },
    );

    registerOtpCooldownStore.set(sanitizedEmail, Date.now());

    logInfo("OTP sent for registration", {
      emailDomain: getEmailDomain(sanitizedEmail),
      messageId: sendResult.info?.messageId,
    });

    return res.status(200).json({
      message:
        "OTP sent to your email. Please verify to complete registration.",
      code: "REGISTER_OTP_SENT",
    });
  } catch (err) {
    logError("Register Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2: Verify OTP and create user account
 */
router.post("/verify-otp", strictRateLimiter, async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email).toLowerCase();
    const sanitizedName = sanitizeString(name);

    // Verify OTP
    const otpRecord = await Otp.findOne({
      email: sanitizedEmail,
      otpCode: otp,
      purpose: "register",
      isUsed: false,
    });

    if (!otpRecord) {
      logSecurityEvent("Invalid OTP attempt", { email: sanitizedEmail });
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    if (otpRecord.expiresAt && otpRecord.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ message: "OTP expired. Please register again." });
    }

    // Check if user already exists (race condition check)
    const existing = await User.findOne({ email: sanitizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      passwordHash,
    });

    logInfo("User registered successfully", {
      userId: user._id,
      email: sanitizedEmail,
    });

    return res.status(201).json({
      id: user._id,
      email: user.email,
      message: "Registration successful! Please login.",
    });
  } catch (err) {
    logError("Verify OTP Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post("/login", strictRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      logSecurityEvent("Login attempt with non-existent email", {
        email: sanitizedEmail,
      });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logSecurityEvent("Failed login attempt", {
        userId: user._id,
        email: sanitizedEmail,
      });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    logInfo("User logged in", { userId: user._id, email: sanitizedEmail });

    return res.json({ token, role: user.role });
  } catch (err) {
    logError("Login Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "name email role isOrganizerApproved",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isOrganizerApproved: user.isOrganizerApproved,
    });
  } catch (err) {
    logError("Get Me Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * PUT /api/auth/switch-role
 * Switch between donor and organizer roles
 */
router.put("/switch-role", requireAuth, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["donor", "organizer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    // If switching to organizer, verify approval
    if (role === "organizer") {
      const app = await OrganizerApplication.findOne({
        user: req.user.userId,
        status: "approved",
      });

      if (!app) {
        return res.status(403).json({
          message: "Your organizer application is not approved.",
        });
      }
    }

    await User.findByIdAndUpdate(req.user.userId, { role });

    logInfo("User switched role", { userId: req.user.userId, newRole: role });

    return res.json({ message: "Role updated successfully." });
  } catch (err) {
    logError("Switch Role Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * PUT /api/auth/update-profile
 * Update user profile information
 */
router.put("/update-profile", requireAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const updates = {
      name: sanitizeString(name),
      email: sanitizeString(email).toLowerCase(),
    };

    // Validate email
    if (!isValidEmail(updates.email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({
      email: updates.email,
      _id: { $ne: req.user.userId },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    // Update password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long.",
        });
      }
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
    }).select("name email role");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    logInfo("User updated profile", { userId: req.user.userId });

    return res.json(updatedUser);
  } catch (err) {
    logError("Update Profile Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP to email
 */
router.post("/forgot-password", strictRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const sanitizedEmail = sanitizeString(email).toLowerCase();

    const emailValidation = await validateEmailForOtp(sanitizedEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        message: emailValidation.message,
        code: emailValidation.code,
      });
    }

    if (emailValidation.isUncertain) {
      logInfo("Forgot-password DNS check uncertain; allowing OTP fallback", {
        emailDomain: getEmailDomain(sanitizedEmail),
        reason: emailValidation.code,
      });
    }

    // Validate environment
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logError("Email service not configured");
      return res
        .status(500)
        .json({
          message: "Email server not configured properly.",
          code: "EMAIL_SERVICE_NOT_CONFIGURED",
        });
    }

    const cooldownRemainingMs = getOtpCooldownRemainingMs(
      forgotOtpCooldownStore,
      sanitizedEmail,
      FORGOT_OTP_COOLDOWN_MS,
    );
    if (cooldownRemainingMs > 0) {
      const retryAfterSeconds = Math.ceil(cooldownRemainingMs / 1000);
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds}s before requesting another OTP.`,
        code: "OTP_REQUEST_COOLDOWN",
        retryAfterSeconds,
      });
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      // Don't reveal if email exists (security best practice)
      logInfo("Password reset requested for non-existent email", {
        emailDomain: getEmailDomain(sanitizedEmail),
      });
      return res.json({
        message: "If that email exists, an OTP has been sent.",
        code: "FORGOT_PASSWORD_OTP_DISPATCHED",
      });
    }

    // Generate reset OTP and store it for forgot-password flow
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const sendResult = await sendOtpEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset OTP</h2>
        <p>You requested a password reset for your account.</p>
        <p>Your one-time password (OTP) is:</p>
        <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; margin: 16px 0;">${otpCode}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
      `,
    });

    if (!sendResult.ok) {
      logError("Forgot Password Email Send Error", sendResult.error, {
        emailDomain: getEmailDomain(sanitizedEmail),
      });

      return res.status(503).json({
        message: sendResult.message,
        code: sendResult.code,
      });
    }

    await Otp.findOneAndUpdate(
      { email: sanitizedEmail, purpose: "forget-password" },
      {
        email: sanitizedEmail,
        otpCode,
        purpose: "forget-password",
        expiresAt,
        isUsed: false,
      },
      { upsert: true, new: true },
    );

    forgotOtpCooldownStore.set(sanitizedEmail, Date.now());

    // Detailed logging for debugging
    logInfo("Password reset email sent successfully", {
      userId: user._id,
      emailDomain: getEmailDomain(user.email),
      messageId: sendResult.info?.messageId,
      accepted: sendResult.info?.accepted,
      from: process.env.EMAIL_USER,
    });

    return res.json({
      message: "If that email exists, an OTP has been sent.",
      code: "FORGOT_PASSWORD_OTP_DISPATCHED",
    });
  } catch (err) {
    logError("Forgot Password Error", err, {
      emailDomain: getEmailDomain(req.body.email),
    });
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/auth/verify-reset-otp
 * Verify OTP for forgot-password flow
 */
router.post("/verify-reset-otp", strictRateLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const sanitizedEmail = sanitizeString(email).toLowerCase();

    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const otpRecord = await Otp.findOne({
      email: sanitizedEmail,
      otpCode: sanitizeString(otp),
      purpose: "forget-password",
      isUsed: false,
    });

    if (
      !otpRecord ||
      (otpRecord.expiresAt && otpRecord.expiresAt < new Date())
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    return res.json({ message: "OTP verified." });
  } catch (err) {
    logError("Verify Reset OTP Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post("/reset-password", strictRateLimiter, async (req, res) => {
  try {
    const { token, email, otp, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "New password required." });
    }

    if (!token && (!email || !otp)) {
      return res.status(400).json({
        message: "Either reset token or email + OTP are required.",
      });
    }

    let user;

    // Backward-compatible token flow
    if (token) {
      user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      });
    } else {
      const sanitizedEmail = sanitizeString(email).toLowerCase();

      if (!isValidEmail(sanitizedEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const otpRecord = await Otp.findOne({
        email: sanitizedEmail,
        otpCode: sanitizeString(otp),
        purpose: "forget-password",
        isUsed: false,
      });

      if (
        !otpRecord ||
        (otpRecord.expiresAt && otpRecord.expiresAt < new Date())
      ) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }

      user = await User.findOne({ email: sanitizedEmail });

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      otpRecord.isUsed = true;
      await otpRecord.save();
    }

    if (!user) {
      logSecurityEvent("Invalid password reset attempt", { token });
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Validate new password
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    // Hash and save new password
    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    logInfo("Password reset successful", { userId: user._id });

    return res.json({ message: "Password reset successful." });
  } catch (err) {
    logError("Reset Password Error", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;
