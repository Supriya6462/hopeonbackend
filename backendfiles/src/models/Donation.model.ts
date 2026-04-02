import mongoose, { Document } from "mongoose";

export interface IDonation extends Document {
  _id: mongoose.Types.ObjectId;
  campaign: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  donorEmail: string;
  isAnonymous: boolean;
  amount: number;
  method: "paypal";
  paypalOrderId?: string;
  transactionId: string;
  payerEmail?: string | null;
  payerName?: string | null;
  payerCountry?: string | null;
  captureDetails?: any | null;
  status: "COMPLETED" | "PENDING" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    donor: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    donorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["paypal"], default: "paypal" },
    paypalOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    transactionId: { type: String, required: true, unique: true, index: true },
    payerEmail: { type: String, lowercase: true, trim: true },
    payerName: String,
    payerCountry: String,
    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "FAILED"],
      default: "PENDING",
      index: true,
    },
    captureDetails: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Indexes for performance
DonationSchema.index({ campaign: 1, createdAt: -1 });
DonationSchema.index({ donor: 1, createdAt: -1 });

export const Donation = mongoose.model<IDonation>("Donation", DonationSchema);
