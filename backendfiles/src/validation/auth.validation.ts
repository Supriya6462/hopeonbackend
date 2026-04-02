import { z } from "zod";
import { OtpPurpose } from "../types/enums.js";

const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: strongPasswordSchema,
  phoneNumber: z.string().trim().min(7).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const requestOtpSchema = z.object({
  email: z.string().trim().email(),
  purpose: z.nativeEnum(OtpPurpose),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
  purpose: z.nativeEnum(OtpPurpose),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    password: strongPasswordSchema.optional(),
    phoneNumber: z.string().trim().min(7).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const verifyResetOtpSchema = z.object({
  email: z.string().trim().email(),
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
  password: strongPasswordSchema,
});
