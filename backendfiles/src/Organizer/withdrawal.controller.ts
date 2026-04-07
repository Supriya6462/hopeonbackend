import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { withdrawalService } from "./withdrawal.service";
import { ApiError } from "../utils/ApiError.js";
import {
  buildRequestHash,
  getStoredIdempotentResponse,
  storeIdempotentResponse,
} from "../utils/idempotency.js";

export class WithdrawalController {
  private sendError(res: Response, error: unknown): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    const err = error as Error;
    res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  // Organizer - Create withdrawal request
  async createWithdrawalRequest(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const idempotencyKey = req.get("Idempotency-Key") || "";
      const requestHash = buildRequestHash(req.body);
      const idempotencyState = await getStoredIdempotentResponse({
        idempotencyKey,
        userId: req.user._id.toString(),
        endpoint: "withdrawal_create",
        requestHash,
      });

      if (idempotencyState.conflict || idempotencyState.replay) {
        res
          .status(idempotencyState.statusCode || 200)
          .json(idempotencyState.responseBody || {});
        return;
      }

      const withdrawal = await withdrawalService.createWithdrawalRequest(
        req.user._id.toString(),
        req.body,
      );

      const responseBody = {
        success: true,
        message: "Withdrawal request submitted",
        data: withdrawal,
      };

      await storeIdempotentResponse({
        idempotencyKey,
        userId: req.user._id.toString(),
        endpoint: "withdrawal_create",
        requestHash,
        statusCode: 201,
        responseBody,
      });

      res.status(201).json(responseBody);
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Organizer - Get own withdrawal requests
  async getOrganizerWithdrawals(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const withdrawals = await withdrawalService.getOrganizerWithdrawals(
        req.user._id.toString(),
      );
      res.status(200).json({ success: true, data: withdrawals });
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Admin - Get all withdrawal requests
  async getAllWithdrawals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const withdrawals = await withdrawalService.getAllWithdrawals(req.query);
      res.status(200).json({ success: true, data: withdrawals });
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Get single withdrawal request
  async getWithdrawalById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const withdrawal = await withdrawalService.getWithdrawalById(
        req.params.id,
        req.user._id.toString(),
        req.user.role,
      );
      res.status(200).json({ success: true, data: withdrawal });
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Admin - Approve withdrawal
  async approveWithdrawal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const withdrawal = await withdrawalService.approveWithdrawal(
        req.params.id,
        req.user._id.toString(),
      );
      res.status(200).json({
        success: true,
        message: "Withdrawal request approved",
        data: withdrawal,
      });
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Admin - Reject withdrawal
  async rejectWithdrawal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { adminMessage } = req.body;
      const withdrawal = await withdrawalService.rejectWithdrawal(
        req.params.id,
        req.user._id.toString(),
        adminMessage,
      );
      res.status(200).json({
        success: true,
        message: "Withdrawal request rejected",
        data: withdrawal,
      });
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Admin - Mark as paid
  async markAsPaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { paymentReference } = req.body;
      const withdrawal = await withdrawalService.markAsPaid(
        req.params.id,
        req.user._id.toString(),
        paymentReference,
      );
      res.status(200).json({
        success: true,
        message: "Withdrawal marked as paid",
        data: withdrawal,
      });
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Organizer - Upload withdrawal document
  async uploadWithdrawalDocument(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const result = await withdrawalService.uploadWithdrawalDocument(
        req.file as any,
        req.body.documentType,
      );

      res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
      this.sendError(res, error);
    }
  }

  // Organizer - Get available campaign balance
  async getAvailableBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const data = await withdrawalService.getAvailableBalance(
        req.params.campaignId,
        req.user._id.toString(),
      );

      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      this.sendError(res, error);
    }
  }

  // Admin - Verify document
  async verifyWithdrawalDocument(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const withdrawal = await withdrawalService.verifyWithdrawalDocument(
        req.params.id,
        req.body.documentType,
        req.body.verified,
        req.user._id.toString(),
      );

      res.status(200).json({
        success: true,
        message: `Document ${req.body.verified ? "verified" : "unverified"} successfully`,
        data: withdrawal,
      });
    } catch (error: unknown) {
      this.sendError(res, error);
    }
  }
}

export const withdrawalController = new WithdrawalController();
