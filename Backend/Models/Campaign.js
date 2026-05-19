import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageURL: { type: String, required: true },
    target: { type: Number, required: true, min: 0 },
    raised: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "expired", "inactive"],
      default: "active",
      index: true,
    },
    deadlineAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    expiresProcessedAt: {
      type: Date,
      default: null,
    },
    isDonationEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    owner: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Indexes for performance
CampaignSchema.index({ createdAt: -1 });
CampaignSchema.index({ raised: 1, target: 1 });
CampaignSchema.index({ status: 1, deadlineAt: 1 });

const Campaign = mongoose.model("Campaign", CampaignSchema);
export default Campaign;
