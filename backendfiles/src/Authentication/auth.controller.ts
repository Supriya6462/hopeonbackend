import { asyncHandler } from "../middleware/errorHandler.middleware";
import { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendResponse } from "../utils/sendResponse.js";
import { OtpPurpose } from "../types/enums";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: { result },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  const accessToken = generateAccessToken(result.user.id.toString());
  const refreshToken = generateRefreshToken(result.user.id.toString());

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: 200,
    message: "Logged in successfully",
    data: {
      result: {
        _id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
        role: result.user.role,
        isOrganizerApproved: result.user.isOrganizerApproved,
      },
      accessToken,
    },
  });
});

export const Alluserlist = asyncHandler(async (req: Request, res: Response) => {
  const { users, pagination } = await authService.getalluser(req.query);
  sendResponse(res, {
    statusCode: 200,
    message: "Fetched all data successfully",
    data: { users },
    meta: { pagination },
  });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.getProfile(req.user!._id.toString());
  sendResponse(res, {
    statusCode: 200,
    data: { result },
  });
});

export const me = getProfile;

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.updateProfile(
      req.user!._id.toString(),
      req.body,
    );
    sendResponse(res, {
      statusCode: 200,
      message: "User Updated successfully",
      data: { result },
    });
  },
);
export const requestOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body;
  const result = await authService.generateOTP(email, purpose as OtpPurpose);
  sendResponse(res, {
    statusCode: 200,
    message: "otp generated successfully",
    data: { result },
  });
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otpCode, purpose } = req.body;
  const result = await authService.verifyOTP(email, otpCode, purpose);
  sendResponse(res, {
    statusCode: 200,
    data: { result },
  });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { result },
    });
  },
);

export const verifyResetOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otpCode } = req.body;
    const result = await authService.verifyResetOtp(email, otpCode);
    sendResponse(res, {
      statusCode: 200,
      data: { result },
    });
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body);
    sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { result },
    });
  },
);

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });
  sendResponse(res, {
    statusCode: 200,
    message: "Logged out successfully",
  });
});
