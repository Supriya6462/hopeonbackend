// import { Request, Response } from "express";
// import { authService } from "./auth.service.js";
// import { AuthRequest } from "../middleware/auth.middleware.js";
// import { OtpPurpose } from "../types/enums.js";
// import { asyncHandler } from "../middleware/errorHandler.middleware.js";
// import { sendResponse } from "../utils/sendResponse.js";

import { asyncHandler } from "../middleware/errorHandler.middleware";
import { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendResponse } from "../utils/sendResponse.js";
import { OtpPurpose } from "../types/enums";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens";

// export class AuthController {
//   // async register(req: Request, res: Response): Promise<void> {
//   //   try {
//   //     const result = await authService.register(req.body);
//   //     res.status(201).json({
//   //       success: true,
//   //       message: result.message,
//   //       data: result,
//   //     });
//   //   } catch (error: any) {
//   //     res.status(400).json({
//   //       success: false,
//   //       message: error.message || "Registration failed",
//   //     });
//   //   }
//   // }
//   register= asyncHandler(async(req: Request, res: Response)=> {
//     const result = await authService.register(req.body);
//     sendResponse(res,{
//       statusCode:201,
//       message:"User created successfully",
//       data: { result }

//     })
//   });

//   async login(req: Request, res: Response): Promise<void> {
//     try {
//       const result = await authService.login(req.body);
//       res.status(200).json({
//         success: true,
//         message: "Login successful",
//         data: result,
//       });
//     } catch (error: any) {
//       res.status(401).json({
//         success: false,
//         message: error.message || "Login failed",
//       });
//     }
//   }

//   async getProfile(req: AuthRequest, res: Response): Promise<void> {
//     try {
//       const user = await authService.getProfile(req.user!._id.toString());
//       res.status(200).json({
//         success: true,
//         data: user,
//       });
//     } catch (error: any) {
//       res.status(404).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }

//   async updateProfile(req: AuthRequest, res: Response): Promise<void> {
//     try {
//       const user = await authService.updateProfile(
//         req.user!._id.toString(),
//         req.body
//       );
//       res.status(200).json({
//         success: true,
//         message: "Profile updated successfully",
//         data: user,
//       });
//     } catch (error: any) {
//       res.status(400).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }

//   async requestOTP(req: Request, res: Response): Promise<void> {
//     try {
//       const { email, purpose } = req.body;
//       const result = await authService.generateOTP(
//         email,
//         purpose as OtpPurpose
//       );
//       res.status(200).json({
//         success: true,
//         data: result,
//       });
//     } catch (error: any) {
//       res.status(400).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }

//   async verifyOTP(req: Request, res: Response): Promise<void> {
//     try {
//       const { email, otpCode, purpose } = req.body;
//       const result = await authService.verifyOTP(email, otpCode, purpose);
//       res.status(200).json({
//         success: true,
//         data: result,
//       });
//     } catch (error: any) {
//       res.status(400).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }
// }

// export const authController = new AuthController();


export const register = asyncHandler(async(req: Request, res: Response)=> {
  const result = await authService.register(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: { result}

  });
});

export const login = asyncHandler(async(req: Request, res: Response)=> {
  const result = await authService.login(req.body);
  const accessToken=generateAccessToken(result.user.id.toString());
  const refreshToken=generateRefreshToken(result.user.id.toString());

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
        isOrganizerApproved: result.user.isOrganizerApproved
      }, accessToken
    }
  });
});

export const getProfile = asyncHandler(async(req: Request, res: Response)=> {
  const result = await authService.getProfile(req.user!._id.toString());
  sendResponse(res, {
    statusCode:200,
    data: {result}
  });
});

export const updateProfile = asyncHandler(async(req: Request, res: Response)=> {
  const result = await authService.updateProfile(req.user!._id.toString(),req.body);
  sendResponse(res, {
    statusCode: 200,
    message: "User Updated successfully",
    data: {result}
  });
});
export const requestOTP = asyncHandler(async(req: Request, res: Response)=> {
  const { email,purpose } = req.body;
  const result = await authService.generateOTP(email, purpose as OtpPurpose);
  sendResponse(res, {
    statusCode: 200,
    message: "otp generated successfully",
    data: {result}
  });
});

export const verifyOTP = asyncHandler(async(req: Request, res: Response)=> {
  const { email, otpCode, purpose } = req.body;
  const result = await authService.verifyOTP(email, otpCode, purpose);
  sendResponse(res, {
    statusCode: 200,
    data: {result}
  });
});

export const logout= asyncHandler(async(_req: Request, res: Response)=> {
  res.clearCookie("refreshToken", {httpOnly: true, sameSite: "strict"});
  sendResponse(res, {
    statusCode:200,
    message: "Logged out successfully"
  });
});
