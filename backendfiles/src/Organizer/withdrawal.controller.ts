import { Response } from "express";
import { AuthRequest } from "../Authentication/auth.middleware";
import { withdrawalService } from "./withdrawal.service";

export class WithdrawalController {
    // Organizer - Create withdrawal request
    async createWithdrawalRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const withdrawal = await withdrawalService.createWithdrawalRequest(
                req.user._id.toString(),
                req.body
            );
            res.status(201).json({
                success: true,
                message: "Withdrawal request submitted",
                data: withdrawal,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Organizer - Get own withdrawal requests
    async getOrganizerWithdrawals(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const withdrawals = await withdrawalService.getOrganizerWithdrawals(
                req.user._id.toString()
            );
            res.status(200).json({ success: true, data: withdrawals });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Get all withdrawal requests
    async getAllWithdrawals(req: AuthRequest, res: Response): Promise<void> {
        try {
            const withdrawals = await withdrawalService.getAllWithdrawals(req.query);
            res.status(200).json({ success: true, data: withdrawals });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
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
                req.user.role
            );
            res.status(200).json({ success: true, data: withdrawal });
        } catch (error: any) {
            res.status(404).json({ success: false, message: error.message });
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
                req.user._id.toString()
            );
            res.status(200).json({
                success: true,
                message: "Withdrawal request approved",
                data: withdrawal,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
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
                adminMessage
            );
            res.status(200).json({
                success: true,
                message: "Withdrawal request rejected",
                data: withdrawal,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
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
                paymentReference
            );
            res.status(200).json({
                success: true,
                message: "Withdrawal marked as paid",
                data: withdrawal,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

export const withdrawalController = new WithdrawalController();
