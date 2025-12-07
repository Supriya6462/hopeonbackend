import { Router } from "express";
import {
  authenticate,
  authorize,
  requireApprovedOrganizer,
} from "../Authentication/auth.middleware.js";
import { Role } from "../types/enums.js";
import { withdrawalController } from "./withdrawal.controller.js";

const router = Router();

// Organizer - Create withdrawal request
router.post(
  "/",
  authenticate,
  authorize(Role.ORGANIZER),
  requireApprovedOrganizer,
  withdrawalController.createWithdrawalRequest.bind(withdrawalController)
);

// Organizer - Get own withdrawal requests
router.get(
  "/my-withdrawals",
  authenticate,
  authorize(Role.ORGANIZER),
  withdrawalController.getOrganizerWithdrawals.bind(withdrawalController)
);

// Admin - Get all withdrawal requests
router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  withdrawalController.getAllWithdrawals.bind(withdrawalController)
);

// Get single withdrawal request
router.get(
  "/:id",
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  withdrawalController.getWithdrawalById.bind(withdrawalController)
);

// Admin - Approve withdrawal
router.patch(
  "/:id/approve",
  authenticate,
  authorize(Role.ADMIN),
  withdrawalController.approveWithdrawal.bind(withdrawalController)
);

// Admin - Reject withdrawal
router.patch(
  "/:id/reject",
  authenticate,
  authorize(Role.ADMIN),
  withdrawalController.rejectWithdrawal.bind(withdrawalController)
);

// Admin - Mark as paid
router.patch(
  "/:id/mark-paid",
  authenticate,
  authorize(Role.ADMIN),
  withdrawalController.markAsPaid.bind(withdrawalController)
);

export default router;
