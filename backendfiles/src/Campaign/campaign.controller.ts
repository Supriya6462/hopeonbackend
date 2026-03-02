import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { campaignService } from "./campaign.service";
import { sendResponse } from "../utils/sendResponse";

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const organizerId = req.user?._id;
  if (!organizerId) {
    sendResponse(res, {
      statusCode: 401,
      message: "Unauthorized"
    });
    return;
  }

  const result = await campaignService.createCampaign(organizerId.toString(), req.body);
  
  sendResponse(res, {
    statusCode: 201,
    message: "Campaign created successfully. Awaiting admin approval.",
    data: { result }
  });
});

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { campaigns, pagination } = await campaignService.getCampaigns(
    req.query,
    req.user?._id?.toString(),
    req.user?.role
  );
  
  sendResponse(res, {
    statusCode: 200,
    message: "Campaigns fetched successfully",
    data: { campaigns },
    meta: { pagination }
  });
});

export const getCampaignById = asyncHandler(async (req: Request, res: Response) => {
  const result = await campaignService.getCampaignById(
    req.params.id,
    req.user?._id?.toString(),
    req.user?.role
  );
  
  sendResponse(res, {
    statusCode: 200,
    data: { result }
  });
});

export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, {
      statusCode: 401,
      message: "Unauthorized"
    });
    return;
  }

  const result = await campaignService.updateCampaign(
    req.params.id,
    req.user._id.toString(),
    req.user.role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Campaign updated successfully",
    data: { result }
  });
});

export const approveCampaign = asyncHandler(async (req: Request, res: Response) => {
  const result = await campaignService.approveCampaign(req.params.id);
  
  sendResponse(res, {
    statusCode: 200,
    message: "Campaign approved successfully",
    data: { result }
  });
});

export const closeCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, {
      statusCode: 401,
      message: "Unauthorized"
    });
    return;
  }

  const result = await campaignService.closeCampaign(
    req.params.id,
    req.user._id.toString(),
    req.user.role
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Campaign closed successfully",
    data: { result }
  });
});

export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, {
      statusCode: 401,
      message: "Unauthorized"
    });
    return;
  }

  const result = await campaignService.deleteCampaign(
    req.params.id,
    req.user._id.toString(),
    req.user.role
  );

  sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});
