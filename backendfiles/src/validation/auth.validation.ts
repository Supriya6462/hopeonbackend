import { z } from "zod";
import { OtpPurpose } from "../types/enums.js";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
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
    password: z.string().min(8).max(128).optional(),
    phoneNumber: z.string().trim().min(7).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
