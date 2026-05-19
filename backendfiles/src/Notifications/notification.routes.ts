import { Router } from "express";
import { z } from "zod";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateParams, validateQuery } from "../validation/validate.js";

const router = Router();

const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

const notificationIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid notification id"),
});

router.get(
  "/me",
  authenticate,
  validateQuery(listNotificationsQuerySchema),
  async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
      } = req.query as {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
      };

      const recipient = req.user!._id;
      const query = {
        recipient,
        ...(unreadOnly ? { readAt: null } : {}),
      };

      const [items, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Notification.countDocuments(query),
        Notification.countDocuments({ recipient, readAt: null }),
      ]);

      return res.json({
        notifications: items,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  "/:id/read",
  authenticate,
  validateParams(notificationIdParamSchema),
  async (req, res, next) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          recipient: req.user!._id,
        },
        { $set: { readAt: new Date() } },
        { new: true },
      );

      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: "Notification not found" });
      }

      return res.json({
        success: true,
        message: "Notification marked as read",
        notification,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
