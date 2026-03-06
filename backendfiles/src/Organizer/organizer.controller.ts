import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { organizerService } from "./organizer.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { sendResponse } from "../utils/sendResponse";
import { ApiError } from "../utils/ApiError";

export const submitApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const application = await organizerService.submitApplication(
      req.user!._id.toString(),
      req.body,
    );

    sendResponse(res, {
      statusCode: 201,
      message: "Application submitted successfully",
      data: { application },
    });
  },
);
export const createDraftApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.createDraftApplication(
      req.user!._id.toString(),
      req.body,
    );

    sendResponse(res, {
      statusCode: 201,
      message: result.isUpdate
        ? "Draft application updated"
        : "Draft application created. Please upload documents to complete.",
      data: { application: result.application },
    });
  },
);

export const uploadDocumentsAndSubmit = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const files = req.files as {
      governmentId?: Express.Multer.File[];
      selfieWithId?: Express.Multer.File[];
      registrationCertificate?: Express.Multer.File[];
      taxId?: Express.Multer.File[];
      addressProof?: Express.Multer.File[];
      additionalDocuments?: Express.Multer.File[];
    };

    const application = await organizerService.uploadDocumentsAndSubmit(
      req.user!._id.toString(),
      req.params.applicationId,
      files,
    );

    sendResponse(res, {
      statusCode: 200,
      message: "Documents uploaded and application submitted for review",
      data: { application },
    });
  },
);

export const getDraftApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const application = await organizerService.getDraftApplication(
      req.user!._id.toString(),
    );

    sendResponse(res, {
      statusCode: 200,
      data: { application },
    });
  },
);

export const getUserApplications = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const applications = await organizerService.getUserApplications(
      req.user!._id.toString(),
    );

    sendResponse(res, {
      statusCode: 200,
      data: { applications },
    });
  },
);

export const getAllApplications = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.getAllApplications(req.query);

    sendResponse(res, {
      statusCode: 200,
      data: result,
    });
  },
);

export const getApplicationById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const application = await organizerService.getApplicationById(
      req.params.id,
    );

    sendResponse(res, {
      statusCode: 200,
      data: { application },
    });
  },
);

export const approveApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
      throw new ApiError(
        "Admin user not found in request",
        401,
        "AUTH_REQUIRED",
      );
    }

    const adminNotes = req.body?.adminNotes;

    const application = await organizerService.approveApplication(
      req.params.id,
      req.user._id.toString(),
      adminNotes,
    );

    sendResponse(res, {
      statusCode: 200,
      message: "Application approved. User is now an organizer.",
      data: { application },
    });
  },
);

export const rejectApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
      throw new ApiError(
        "Admin user not found in request",
        401,
        "AUTH_REQUIRED",
      );
    }

    const rejectionReason = req.body?.rejectionReason;
    const adminNotes = req.body?.adminNotes;

    const result = await organizerService.rejectApplication(
      req.params.id,
      req.user._id.toString(),
      rejectionReason,
      adminNotes,
    );

    sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: {
        rejectionReason: result.rejectionReason,
        userNotified: result.userNotified,
      },
    });
  },
);

export const revokeOrganizer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { revocationReason } = req.body;
    if (!req.user?._id) {
      throw new ApiError(
        "Admin user not found in request",
        401,
        "AUTH_REQUIRED",
      );
    }
    const result = await organizerService.revokeOrganizer(
      req.params.id,
      req.user!._id.toString(),
      revocationReason,
    );

    sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: {
        user: result.user,
        actionsPerformed: result.actionsPerformed,
      },
    });
  },
);

export const reinstateOrganizer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
      throw new ApiError(
        "Admin user not found in request",
        401,
        "AUTH_REQUIRED",
      );
    }
    const result = await organizerService.reinstateOrganizer(
      req.params.id,
      req.user!._id.toString(),
    );

    sendResponse(res, {
      statusCode: 200,
      message: result.message,
      data: {
        user: result.user,
        note: result.note,
      },
    });
  },
);

export const getAllOrganizers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.getAllOrganizers(req.query);

    sendResponse(res, {
      statusCode: 200,
      data: result,
    });
  },
);
