import { Response } from "express";
import { AuthRequest } from "../Authentication/auth.middleware";
import { campaignService } from "./campaign.service";

export class CampaignController {

    // CREATE CAMPAIGN (Organizer only)
    async createcampaign(req: AuthRequest, res: Response): Promise<void> {
        try{
            const organizerId = req.user?._id;
            if (!organizerId)
            {
                res.status(401).json({message:"unauthorized "});
                return;
            }

            const result = await campaignService.createCampaign(organizerId.toString(), req.body);
                  res.status(201).json({
                    message: "Campaign created successfully. Awaiting admin approval.",
                    data: result,
      });
        } catch(error: any)
        {
            res.status(400).json({message: error.message});
        }
    }

    // GET ALL CAMPAIGNS (public + admin + organizer)

    async getcampaigns(req: AuthRequest, res: Response): Promise<void>{

        try{
            const result = await campaignService.getCampaigns(
                req.query,
                req.user?._id?.toString(),
                req.user?.role
            );
            res.status(200).json(result);
        } catch(error: any)
        {
            res.status(400).json({message: error.message});
        }
    }

    
    // GET SINGLE CAMPAIGN
    async getcampaignById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await campaignService.getCampaignById(
                req.params.id,
                req.user?._id?.toString(),
                req.user?.role
            );
            res.status(200).json(result);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    }

    // UPDATE CAMPAIGN (Organizer/Admin)
    async updateCampaign(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const result = await campaignService.updateCampaign(
                req.params.id,
                req.user._id.toString(),
                req.user.role,
                req.body
            );

            res.status(200).json({
                message: "Campaign updated successfully",
                data: result,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    // APPROVE CAMPAIGN (Admin only)
    async approveCampaign(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await campaignService.approveCampaign(req.params.id);
            res.status(200).json({
                message: "Campaign approved",
                data: result,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    // CLOSE CAMPAIGN (Organizer/Admin)
    async closeCampaign(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const result = await campaignService.closeCampaign(
                req.params.id,
                req.user._id.toString(),
                req.user.role
            );

            res.status(200).json({
                message: "Campaign closed",
                data: result,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    // DELETE CAMPAIGN (Organizer/Admin)
    async deleteCampaign(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const result = await campaignService.deleteCampaign(
                req.params.id,
                req.user._id.toString(),
                req.user.role
            );

            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
}

export const campaignController = new CampaignController();