import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: [
        "user_registered",
        "user_login",
        "campaign_created",
        "campaign_updated",
        "campaign_deleted",
        "donation_made",
        "withdrawal_requested",
        "withdrawal_approved",
        "withdrawal_rejected",
        "withdrawal_completed",
        "organizer_application_submitted",
        "organizer_application_approved",
        "organizer_application_rejected",
        "profile_updated",
        "password_changed",
        "password_reset",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    relatedEntity: {
      entityType: {
        type: String,
        enum: [
          "Campaign",
          "Donation",
          "WithdrawalRequest",
          "OrganizerApplication",
          "OrganizerProfile",
        ],
      },
      entityId: mongoose.Types.ObjectId,
    },
  },
  { timestamps: true },
);

// Indexes for performance
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ activityType: 1, createdAt: -1 });
ActivityLogSchema.index({
  "relatedEntity.entityType": 1,
  "relatedEntity.entityId": 1,
});
ActivityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
export default ActivityLog;
