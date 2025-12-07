import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  images: string[];
  target: number;
  raised: number;
  owner: mongoose.Types.ObjectId;
  isApproved: boolean;
  isClosed: boolean;
  closedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true, trim: true, maxLength: 150 },
    description: { type: String, trim: true, maxLength: 2000 },
    images: [{ type: String }],
    target: { type: Number, required: true, min: 0 },
    raised: { type: Number, default: 0, min: 0 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isApproved: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
    closedReason: { type: String, trim: true, maxLength: 200, default: null },
  },
  { timestamps: true, versionKey: false }
);

CampaignSchema.index({ owner: 1 });
CampaignSchema.index({ isApproved: 1 });
CampaignSchema.index({ title: "text" });

export const Campaign = mongoose.model<ICampaign>("Campaign", CampaignSchema);