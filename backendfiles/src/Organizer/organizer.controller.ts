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

export const getOrganizerApplicationStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.getOrganizerApplicationStatus(
      req.user!._id.toString(),
    );

    sendResponse(res, {
      statusCode: 200,
      data: result,
    });
  },
);

export const getUserApplicationDetails = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const application = await organizerService.getUserApplicationById(
      req.user!._id.toString(),
      req.params.applicationId,
    );

    sendResponse(res, {
      statusCode: 200,
      data: { application },
    });
  },
);

export const resubmitApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const application = await organizerService.resubmitApplication(
      req.user!._id.toString(),
      req.params.applicationId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      message:
        "Application moved to draft. Please upload documents to submit again.",
      data: { application },
    });
  },
);

export const getOrganizerProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.getOrganizerProfile(
      req.user!._id.toString(),
    );

    sendResponse(res, {
      statusCode: 200,
      data: result,
    });
  },
);

export const uploadOrganizerProfileDocument = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const file = req.file as Express.Multer.File & {
      location?: string;
      key?: string;
    };

    if (!file) {
      throw new ApiError("No file uploaded", 400, "NO_FILE_UPLOADED");
    }

    sendResponse(res, {
      statusCode: 200,
      message: "Document uploaded successfully",
      data: {
        url: file.location,
        key: file.key,
        documentType: req.body.documentType,
      },
    });
  },
);

export const upsertOrganizerProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.upsertOrganizerProfile(
      req.user!._id.toString(),
      req.body,
    );

    sendResponse(res, {
      statusCode: result.created ? 201 : 200,
      message: result.created
        ? "Organizer profile created and submitted for verification."
        : "Organizer profile updated and submitted for verification.",
      data: {
        verificationStatus: result.profile.verificationStatus,
      },
    });
  },
);

export const verifyOrganizerProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { verificationStatus, rejectionReason } = req.body;
    const profile = await organizerService.verifyOrganizerProfile(
      req.params.id,
      req.user!._id.toString(),
      verificationStatus,
      rejectionReason,
    );

    sendResponse(res, {
      statusCode: 200,
      message:
        verificationStatus === "verified"
          ? "Organizer profile verified."
          : "Organizer profile rejected.",
      data: { profile },
    });
  },
);

export const getAdminOrganizerProfiles = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await organizerService.listOrganizerProfiles(req.query);

    sendResponse(res, {
      statusCode: 200,
      data: result,
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
