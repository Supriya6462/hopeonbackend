import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { sendResponse } from "../utils/sendResponse.js";
import {
  getBlockchain,
  getMyDonationTransparency,
  verifyChain,
} from "../services/blockchain.service.js";

export const getBlockchainController = asyncHandler(
  async (req: Request, res: Response) => {
    const { campaignId } = req.query;
    const result = await getBlockchain({ campaignId });

    sendResponse(res, {
      statusCode: 200,
      message: "Blockchain fetched successfully",
      data: {
        blocks: result.blocks,
        isValid: result.isValid,
        totalBlocks: result.blocks.length,
      },
    });
  },
);

export const verifyBlockchainController = asyncHandler(
  async (req: Request, res: Response) => {
    const campaignId = req.body?.campaignId;
    const result = await verifyChain({ campaignId });

    sendResponse(res, {
      statusCode: 200,
      message: "Blockchain verification complete",
      data: {
        blocks: result.blocks,
        isValid: result.isValid,
        totalBlocks: result.blocks.length,
      },
    });
  },
);

export const getMyDonationTransparencyController = asyncHandler(
  async (req: Request, res: Response) => {
    const donorEmail = req.user?.email;
    const { campaignId } = req.query;

    const donations = await getMyDonationTransparency({
      donorEmail: donorEmail || "",
      campaignId,
    });

    sendResponse(res, {
      statusCode: 200,
      message: "Donation transparency fetched successfully",
      data: { donations },
    });
  },
);
