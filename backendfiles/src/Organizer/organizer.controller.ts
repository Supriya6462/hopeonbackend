import { Response } from "express";
import { AuthRequest } from "../Authentication/auth.middleware";
import { organizerService } from "./organizer.service";

export class OrganizerController {
    // Donor - Submit organizer application
    async submitApplication(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const application = await organizerService.submitApplication(
                req.user._id.toString(),
                req.body
            );
            res.status(201).json({
                success: true,
                message: "Application submitted successfully",
                data: application,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Get user's applications
    async getUserApplications(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const applications = await organizerService.getUserApplications(
                req.user._id.toString()
            );
            res.status(200).json({
                success: true,
                data: applications,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Get all applications
    async getAllApplications(req: AuthRequest, res: Response): Promise<void> {
        try {
            const applications = await organizerService.getAllApplications(req.query);
            res.status(200).json({
                success: true,
                data: applications,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Get single application
    async getApplicationById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const application = await organizerService.getApplicationById(
                req.params.id
            );
            res.status(200).json({ success: true, data: application });
        } catch (error: any) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    // Admin - Approve application
    async approveApplication(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const application = await organizerService.approveApplication(
                req.params.id,
                req.user._id.toString()
            );
            res.status(200).json({
                success: true,
                message: "Application approved. User is now an organizer.",
                data: application,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Reject application
    async rejectApplication(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const { rejectionReason } = req.body;
            const application = await organizerService.rejectApplication(
                req.params.id,
                req.user._id.toString(),
                rejectionReason
            );
            res.status(200).json({
                success: true,
                message: "Application rejected",
                data: application,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Revoke organizer privileges
    async revokeOrganizer(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const { revocationReason } = req.body;
            if (!revocationReason) {
                res.status(400).json({ 
                    success: false, 
                    message: "Revocation reason is required" 
                });
                return;
            }

            const result = await organizerService.revokeOrganizer(
                req.params.id,
                req.user._id.toString(),
                revocationReason
            );
            res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Reinstate organizer privileges
    async reinstateOrganizer(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const result = await organizerService.reinstateOrganizer(
                req.params.id,
                req.user._id.toString()
            );
            res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin - Get all organizers
    async getAllOrganizers(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await organizerService.getAllOrganizers(req.query);
            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

export const organizerController = new OrganizerController();