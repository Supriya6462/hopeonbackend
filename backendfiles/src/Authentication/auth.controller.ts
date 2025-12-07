import { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { AuthRequest } from "./auth.middleware.js";
import { OtpPurpose } from "../types/enums.js";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || "Login failed",
      });
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!._id.toString());
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.updateProfile(
        req.user!._id.toString(),
        req.body
      );
      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async requestOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, purpose } = req.body;
      const result = await authService.generateOTP(
        email,
        purpose as OtpPurpose
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otpCode, purpose } = req.body;
      const result = await authService.verifyOTP(email, otpCode, purpose);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const authController = new AuthController();
