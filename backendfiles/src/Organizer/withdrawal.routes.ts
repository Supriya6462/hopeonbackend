import { Router } from "express";
import { NextFunction, Request, Response } from "express";
import {
  authenticate,
  authorize,
  requireApprovedOrganizer,
} from "../middleware/auth.middleware.js";
import { Role } from "../types/enums.js";
import { withdrawalController } from "./withdrawal.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../validation/validate.js";
import {
  createWithdrawalSchema,
  markPaidSchema,
  moveWithdrawalToReviewSchema,
  rejectWithdrawalSchema,
  verifyWithdrawalDocumentSchema,
  withdrawalCampaignParamSchema,
  withdrawalIdParamSchema,
  withdrawalListQuerySchema,
} from "../validation/withdrawal.validation.js";
import {
  applyFileMetadataForResponse,
  documentUpload,
  handleDocumentUploadError,
} from "../config/multer.js";

const router = Router();

const singleWithdrawalDocumentUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  documentUpload.single("document")(req, res, (error) => {
    if (error) {
      return handleDocumentUploadError(error, res);
    }

    applyFileMetadataForResponse(req);
    return next();
  });
};

router.post(
  "/upload-document",
  authenticate,
  authorize(Role.ORGANIZER),
  singleWithdrawalDocumentUpload,
  withdrawalController.uploadWithdrawalDocument.bind(withdrawalController),
);

// Organizer - Create withdrawal request
router.post(
  "/",
  authenticate,
  authorize(Role.ORGANIZER),
  requireApprovedOrganizer,
  validateBody(createWithdrawalSchema),
  withdrawalController.createWithdrawalRequest.bind(withdrawalController),
);

// Organizer - Get own withdrawal requests
router.get(
  "/my-withdrawals",
  authenticate,
  authorize(Role.ORGANIZER),
  withdrawalController.getOrganizerWithdrawals.bind(withdrawalController),
);

router.delete(
  "/:id/cancel",
  authenticate,
  authorize(Role.ORGANIZER),
  validateParams(withdrawalIdParamSchema),
  withdrawalController.cancelWithdrawalRequest.bind(withdrawalController),
);

router.get(
  "/available-balance/:campaignId",
  authenticate,
  authorize(Role.ORGANIZER),
  validateParams(withdrawalCampaignParamSchema),
  withdrawalController.getAvailableBalance.bind(withdrawalController),
);

// Admin - Get all withdrawal requests
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validateQuery(withdrawalListQuerySchema),
  withdrawalController.getAllWithdrawals.bind(withdrawalController),
);

// Get single withdrawal request
router.get(
  "/:id",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  withdrawalController.getWithdrawalById.bind(withdrawalController),
);

// Admin - Approve withdrawal
router.patch(
  "/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  withdrawalController.approveWithdrawal.bind(withdrawalController),
);

// Admin - Move withdrawal to under review
router.patch(
  "/:id/under-review",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  validateBody(moveWithdrawalToReviewSchema),
  withdrawalController.moveToUnderReview.bind(withdrawalController),
);

// Admin - Reject withdrawal
router.patch(
  "/:id/reject",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  validateBody(rejectWithdrawalSchema),
  withdrawalController.rejectWithdrawal.bind(withdrawalController),
);

// Admin - Mark as paid
router.patch(
  "/:id/mark-paid",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  validateBody(markPaidSchema),
  withdrawalController.markAsPaid.bind(withdrawalController),
);

router.patch(
  "/:id/verify-document",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  validateBody(verifyWithdrawalDocumentSchema),
  withdrawalController.verifyWithdrawalDocument.bind(withdrawalController),
);

router.get(
  "/:id/audit-log",
  authenticate,
  authorize(Role.ADMIN),
  validateParams(withdrawalIdParamSchema),
  validateQuery(withdrawalListQuerySchema.pick({ page: true, limit: true })),
  withdrawalController.getWithdrawalAuditLog.bind(withdrawalController),
);

export default router;
