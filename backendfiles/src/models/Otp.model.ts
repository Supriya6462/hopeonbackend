import mongoose, { Schema, Document } from "mongoose";
import { OtpPurpose } from "../types/enums";

export interface IOtp extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  email: string;
  otpCode: string;
  purpose: OtpPurpose;
  expiresAt?: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    otpCode: { type: String, required: true },
    purpose: { type: String, enum: Object.values(OtpPurpose), required: true },
    expiresAt: { type: Date, default: null },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

// TTL index: document will be removed when expiresAt < now
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model<IOtp>("Otp", OtpSchema);