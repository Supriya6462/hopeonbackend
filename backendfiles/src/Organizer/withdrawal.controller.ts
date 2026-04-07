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
  private async handleIdempotencyReplay(
    req: AuthRequest,
    endpoint: string,
  ): Promise<{ statusCode: number; responseBody: unknown } | null> {
    if (!req.user) {
      return null;
    }

    const idempotencyKey = req.get("Idempotency-Key") || "";
    const requestHash = buildRequestHash(req.body);
    const state = await getStoredIdempotentResponse({
      idempotencyKey,
      userId: req.user._id.toString(),
      endpoint,
      requestHash,
    });

    if (state.conflict || state.replay) {
      return {
        statusCode: state.statusCode || 200,
        responseBody: state.responseBody || {},
      };
    }

    return null;
  }

  private async storeIdempotencyResult(
    req: AuthRequest,
    endpoint: string,
    statusCode: number,
    responseBody: unknown,
  ): Promise<void> {
    if (!req.user) {
      return;
    }

    const idempotencyKey = req.get("Idempotency-Key") || "";
    const requestHash = buildRequestHash(req.body);

    await storeIdempotentResponse({
      idempotencyKey,
      userId: req.user._id.toString(),
      endpoint,
      requestHash,
      statusCode,
      responseBody,
    });
  }

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

      const replay = await this.handleIdempotencyReplay(
        req,
        "withdrawal_approve",
      );
      if (replay) {
        res.status(replay.statusCode).json(replay.responseBody);
        return;
      }

      const withdrawal = await withdrawalService.approveWithdrawal(
        req.params.id,
        req.user._id.toString(),
      );

      const responseBody = {
        success: true,
        message: "Withdrawal request approved",
        data: withdrawal,
      };

      await this.storeIdempotencyResult(
        req,
        "withdrawal_approve",
        200,
        responseBody,
      );
      res.status(200).json(responseBody);
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

      const replay = await this.handleIdempotencyReplay(
        req,
        "withdrawal_reject",
      );
      if (replay) {
        res.status(replay.statusCode).json(replay.responseBody);
        return;
      }

      const { adminMessage } = req.body;
      const withdrawal = await withdrawalService.rejectWithdrawal(
        req.params.id,
        req.user._id.toString(),
        adminMessage,
      );

      const responseBody = {
        success: true,
        message: "Withdrawal request rejected",
        data: withdrawal,
      };

      await this.storeIdempotencyResult(
        req,
        "withdrawal_reject",
        200,
        responseBody,
      );
      res.status(200).json(responseBody);
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

      const replay = await this.handleIdempotencyReplay(
        req,
        "withdrawal_mark_paid",
      );
      if (replay) {
        res.status(replay.statusCode).json(replay.responseBody);
        return;
      }

      const { paymentReference } = req.body;
      const withdrawal = await withdrawalService.markAsPaid(
        req.params.id,
        req.user._id.toString(),
        paymentReference,
      );

      const responseBody = {
        success: true,
        message: "Withdrawal marked as paid",
        data: withdrawal,
      };

      await this.storeIdempotencyResult(
        req,
        "withdrawal_mark_paid",
        200,
        responseBody,
      );
      res.status(200).json(responseBody);
    } catch (error: any) {
      this.sendError(res, error);
    }
  }

  // Admin - Move to under review
  async moveToUnderReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const replay = await this.handleIdempotencyReplay(
        req,
        "withdrawal_under_review",
      );
      if (replay) {
        res.status(replay.statusCode).json(replay.responseBody);
        return;
      }

      const withdrawal = await withdrawalService.moveToUnderReview(
        req.params.id,
        req.user._id.toString(),
        req.body.reviewNotes,
      );

      const responseBody = {
        success: true,
        message: "Withdrawal moved to under review",
        data: withdrawal,
      };

      await this.storeIdempotencyResult(
        req,
        "withdrawal_under_review",
        200,
        responseBody,
      );
      res.status(200).json(responseBody);
    } catch (error: unknown) {
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

  // Organizer - Cancel own pending withdrawal
  async cancelWithdrawalRequest(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const result = await withdrawalService.cancelWithdrawalRequest(
        req.params.id,
        req.user._id.toString(),
      );

      res.status(200).json({
        success: true,
        message: "Withdrawal request cancelled",
        data: result,
      });
    } catch (error: unknown) {
      this.sendError(res, error);
    }
  }

  // Admin - Withdrawal audit logs
  async getWithdrawalAuditLog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await withdrawalService.getWithdrawalAuditLog(
        req.params.id,
        {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        },
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      this.sendError(res, error);
    }
  }
}

export const withdrawalController = new WithdrawalController();
