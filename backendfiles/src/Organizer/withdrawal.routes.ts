import { Router } from "express";
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
  rejectWithdrawalSchema,
  withdrawalIdParamSchema,
  withdrawalListQuerySchema,
} from "../validation/withdrawal.validation.js";

const router = Router();

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

export default router;
