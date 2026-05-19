import { Router } from "express";
import Notification from "../Models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/notifications/me", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit || "20", 10)),
    );
    const unreadOnly = req.query.unreadOnly === "true";

    const query = {
      recipient: req.user.userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({
        recipient: req.user.userId,
        readAt: null,
      }),
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
    console.error("List Notifications Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user.userId,
      },
      {
        $set: {
          readAt: new Date(),
        },
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Read Notification Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
