// 

import jwt, { SignOptions } from "jsonwebtoken";
import { ApiError } from "./ApiError";

// ✅ Type-safe template literal for jwt expirations
type JwtExp = `${number}${"s" | "m" | "h" | "d" | "y"}`;

// Read environment variables and validate
const ACCESS_TOKEN_EXP: JwtExp = (process.env.ACCESS_TOKEN_EXP as JwtExp) || "15m";
const REFRESH_TOKEN_EXP: JwtExp = (process.env.REFRESH_TOKEN_EXP as JwtExp) || "7d";

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is missing in environment variables!");
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is missing in environment variables!");
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// -----------------------------
// Generate Access Token
// -----------------------------
export const generateAccessToken = (userId: string): string => {
  const payload = { userId };
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXP };

  return jwt.sign(payload, ACCESS_SECRET, options);
};

// -----------------------------
// Generate Refresh Token
// -----------------------------
export const generateRefreshToken = (userId: string): string => {
  const payload = { userId };
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXP };

  return jwt.sign(payload, REFRESH_SECRET, options);
};

// -----------------------------
// Optional: Verify Tokens
// -----------------------------
export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    throw new ApiError("Invalid or expired access token", 401, "TOKEN_INVALID");
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    throw new ApiError("Invalid or expired refresh token", 401, "TOKEN_INVALID");
  }
};
