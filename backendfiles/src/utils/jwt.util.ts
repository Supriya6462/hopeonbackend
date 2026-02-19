import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError";

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError("JWT_SECRET is not defined",500,"JWT_CONFIG_ERROR");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign({ userId }, secret, { expiresIn } as any);
};

export const verifyToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError("JWT_SECRET is not defined",500,"JWT_CONFIG_ERROR");
  }

  return jwt.verify(token, secret) as { userId: string };
};
