import { Response } from "express";
import { AuthRequest } from "../Authentication/auth.middleware";
import { donationService } from "./donation.service";

export class DonationController {
    // Donor - Create donation
    async createDonation(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const donation = await donationService.createDonation(
                req.user._id.toString(),
                req.body
            );
            res.status(201).json({
                success: true,
                message: "Donation initiated",
                data: donation,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Update donation status (webhook or internal)
    async updateDonationStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { status, paymentDetails } = req.body;
            const donation = await donationService.updateDonationStatus(
                req.params.id,
                status,
                paymentDetails
            );
            res.status(200).json({
                success: true,
                message: "Donation status updated",
                data: donation,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Get donations by campaign (public for completed donations)
    async getDonationsByCampaign(req: AuthRequest, res: Response): Promise<void> {
        try {
            const donations = await donationService.getDonationsByCampaign(
                req.params.campaignId,
                req.query
            );
            res.status(200).json({
                success: true,
                data: donations,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Get user's donations
    async getDonationsByDonor(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const donations = await donationService.getDonationsByDonor(
                req.user._id.toString()
            );
            res.status(200).json({
                success: true,
                data: donations,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Get all donations
    async getAllDonations(req: AuthRequest, res: Response): Promise<void> {
        try {
            const donations = await donationService.getAllDonations(req.query);
            res.status(200).json({
                success: true,
                data: donations,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Get donation statistics
    async getDonationStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const stats = await donationService.getDonationStats(
                req.params.campaignId
            );
            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

export const donationController = new DonationController();

