import OrganizerApplication from "../Models/OrganizerApplication.js";
import User from "../Models/User.js";
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.patch(
  "/admin/applications/:id/approve",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const app = await OrganizerApplication.findById(id).populate("user");
      if (!app) {
        return res.status(404).json({ message: "Application not found." });
      }
      if (app.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Only pending can be approved." });
      }

      // 1) Mark the application as approved
      app.status = "approved";
      app.reviewedBy = req.user.userId;
      app.reviewedAt = new Date();
      await app.save();

      // 2) Update the user’s role
      const userToUpdate = await User.findById(app.user._id);
      if (!userToUpdate) {
        // (In principle this should never happen, since we populated "user" above,
        // but in case the user record was deleted between findById and now…)
        return res.status(404).json({ message: "Associated user not found." });
      }
      userToUpdate.role = "organizer";
      await userToUpdate.save();

      return res.json({
        message: "Application approved; user is now an organizer.",
      });
    } catch (err) {
      console.error("Approve Application Error:", err);
      return res
        .status(500)
        .json({ message: "Could not approve application." });
    }
  }
);

export default router;
