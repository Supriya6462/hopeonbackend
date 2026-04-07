import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { sendResponse } from "../utils/sendResponse.js";
import { adminService } from "./admin.service.js";
import {
  buildRequestHash,
  getStoredIdempotentResponse,
  storeIdempotentResponse,
} from "../utils/idempotency.js";
import { ApiError } from "../utils/ApiError.js";

async function resolveIdempotencyReplay(
  req: Request,
  endpoint: string,
): Promise<{ statusCode: number; responseBody: unknown } | null> {
  if (!req.user) {
    throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
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

async function persistIdempotentResult(
  req: Request,
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

export const getAdminDashboardStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await adminService.getDashboardStats();

    sendResponse(res, {
      statusCode: 200,
      message: "Dashboard stats fetched successfully",
      data: stats,
    });
  },
);

export const getAdminUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.listUsers(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      message: "Users fetched successfully",
      data: { users: result.users },
      meta: { pagination: result.pagination },
    });
  },
);

export const getAdminUserDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.getUserDetails(req.params.userId);

    sendResponse(res, {
      statusCode: 200,
      message: "User details fetched successfully",
      data: result,
    });
  },
);

export const patchAdminUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_patch_user_status",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const user = await adminService.updateUserStatus(
      req.params.userId,
      req.user._id.toString(),
      req.body,
    );

    const responseBody = {
      success: true,
      message: "User status updated successfully",
      data: { user },
    };

    await persistIdempotentResult(
      req,
      "admin_patch_user_status",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const getAdminUserDonations = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.getUserDonations(req.params.userId);

    sendResponse(res, {
      statusCode: 200,
      message: "User donations fetched successfully",
      data: result,
    });
  },
);

export const getAdminCampaigns = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.listCampaigns(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      message: "Campaigns fetched successfully",
      data: { campaigns: result.campaigns },
      meta: { pagination: result.pagination },
    });
  },
);

export const getAdminCampaignDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.getCampaignDetails(req.params.campaignId);

    sendResponse(res, {
      statusCode: 200,
      message: "Campaign details fetched successfully",
      data: result,
    });
  },
);

export const removeAdminCampaign = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(req, "admin_remove_campaign");
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    await adminService.deactivateCampaign(
      req.params.campaignId,
      req.user._id.toString(),
    );

    const responseBody = {
      success: true,
      message: "Campaign marked as inactive successfully",
      data: null,
    };

    await persistIdempotentResult(
      req,
      "admin_remove_campaign",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const getAdminDonations = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.listDonations(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      message: "Donations fetched successfully",
      data: { donations: result.donations },
      meta: { pagination: result.pagination },
    });
  },
);

export const getAdminActivities = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.listActivities(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      message: "Activities fetched successfully",
      data: { activities: result.activities },
      meta: { pagination: result.pagination },
    });
  },
);

export const listAdminApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.listApplications(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      message: "Applications fetched successfully",
      data: { applications: result.applications },
      meta: { pagination: result.pagination },
    });
  },
);

export const getAdminApplicationDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const application = await adminService.getApplicationById(req.params.id);

    sendResponse(res, {
      statusCode: 200,
      message: "Application fetched successfully",
      data: { application },
    });
  },
);

export const approveAdminApplication = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_approve_application",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const application = await adminService.approveApplication(
      req.params.id,
      req.user._id.toString(),
      req.body.adminNotes,
    );

    const responseBody = {
      success: true,
      message: "Application approved successfully",
      data: { application },
    };

    await persistIdempotentResult(
      req,
      "admin_approve_application",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const rejectAdminApplication = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_reject_application",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const result = await adminService.rejectApplication(
      req.params.id,
      req.user._id.toString(),
      req.body.rejectionReason,
      req.body.adminNotes,
    );

    const responseBody = {
      success: true,
      message: "Application rejected successfully",
      data: result,
    };

    await persistIdempotentResult(
      req,
      "admin_reject_application",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const revokeAdminOrganizer = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_revoke_organizer",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const result = await adminService.revokeOrganizer(
      req.params.id,
      req.user._id.toString(),
      req.body.revocationReason,
    );

    const responseBody = {
      success: true,
      message: "Organizer revoked successfully",
      data: result,
    };

    await persistIdempotentResult(
      req,
      "admin_revoke_organizer",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const reinstateAdminOrganizer = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_reinstate_organizer",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const result = await adminService.reinstateOrganizer(
      req.params.id,
      req.user._id.toString(),
    );

    const responseBody = {
      success: true,
      message: "Organizer reinstated successfully",
      data: result,
    };

    await persistIdempotentResult(
      req,
      "admin_reinstate_organizer",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const getAdminWithdrawals = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.listWithdrawals(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      message: "Withdrawal requests fetched successfully",
      data: { withdrawals: result.withdrawals },
      meta: { pagination: result.pagination },
    });
  },
);

export const getAdminWithdrawalDetails = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const withdrawal = await adminService.getWithdrawalDetails(
      req.params.id,
      req.user._id.toString(),
    );

    sendResponse(res, {
      statusCode: 200,
      message: "Withdrawal details fetched successfully",
      data: { withdrawal },
    });
  },
);

export const moveAdminWithdrawalToUnderReview = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_withdrawal_under_review",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const withdrawal = await adminService.moveWithdrawalToUnderReview(
      req.params.id,
      req.user._id.toString(),
      req.body.reviewNotes,
    );

    const responseBody = {
      success: true,
      message: "Withdrawal moved to under review",
      data: { withdrawal },
    };

    await persistIdempotentResult(
      req,
      "admin_withdrawal_under_review",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const approveAdminWithdrawal = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_approve_withdrawal",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const withdrawal = await adminService.approveWithdrawal(
      req.params.id,
      req.user._id.toString(),
    );

    const responseBody = {
      success: true,
      message: "Withdrawal approved successfully",
      data: { withdrawal },
    };

    await persistIdempotentResult(
      req,
      "admin_approve_withdrawal",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const rejectAdminWithdrawal = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_reject_withdrawal",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const withdrawal = await adminService.rejectWithdrawal(
      req.params.id,
      req.user._id.toString(),
      req.body.adminMessage,
    );

    const responseBody = {
      success: true,
      message: "Withdrawal rejected successfully",
      data: { withdrawal },
    };

    await persistIdempotentResult(
      req,
      "admin_reject_withdrawal",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const completeAdminWithdrawal = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_complete_withdrawal",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const withdrawal = await adminService.completeWithdrawal(
      req.params.id,
      req.user._id.toString(),
      req.body.paymentReference,
    );

    const responseBody = {
      success: true,
      message: "Withdrawal marked as completed",
      data: { withdrawal },
    };

    await persistIdempotentResult(
      req,
      "admin_complete_withdrawal",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const getAdminWithdrawalAuditLog = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminService.getWithdrawalAuditLog(
      req.params.id,
      req.query.page ? Number(req.query.page) : undefined,
      req.query.limit ? Number(req.query.limit) : undefined,
    );

    sendResponse(res, {
      statusCode: 200,
      message: "Withdrawal audit log fetched successfully",
      data: { activities: result.activities },
      meta: { pagination: result.pagination },
    });
  },
);

export const bulkMoveAdminWithdrawalsToUnderReview = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_bulk_under_review_withdrawal",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const result = await adminService.bulkMoveWithdrawalsToUnderReview(
      req.body.withdrawalIds,
      req.user._id.toString(),
      req.body.reviewNotes,
    );

    const responseBody = {
      success: true,
      message: "Bulk under-review operation completed",
      data: result,
    };

    await persistIdempotentResult(
      req,
      "admin_bulk_under_review_withdrawal",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const bulkApproveAdminWithdrawals = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_bulk_approve_withdrawal",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const result = await adminService.bulkApproveWithdrawals(
      req.body.withdrawalIds,
      req.user._id.toString(),
    );

    const responseBody = {
      success: true,
      message: "Bulk approve operation completed",
      data: result,
    };

    await persistIdempotentResult(
      req,
      "admin_bulk_approve_withdrawal",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);

export const bulkRejectAdminWithdrawals = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const replay = await resolveIdempotencyReplay(
      req,
      "admin_bulk_reject_withdrawal",
    );
    if (replay) {
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    const result = await adminService.bulkRejectWithdrawals(
      req.body.withdrawalIds,
      req.user._id.toString(),
      req.body.adminMessage,
    );

    const responseBody = {
      success: true,
      message: "Bulk reject operation completed",
      data: result,
    };

    await persistIdempotentResult(
      req,
      "admin_bulk_reject_withdrawal",
      200,
      responseBody,
    );
    res.status(200).json(responseBody);
  },
);
