import mongoose, { Schema, Document } from "mongoose";

export interface IPendingRegistration extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  expiresAt: Date;
  createdAt: Date;
}

const PendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    name: { type: String, required: true, trim: true, maxLength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxLength: 100,
    },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String, trim: true, default: null },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index - auto-delete after expiry
  },
  { timestamps: true, versionKey: false }
);

PendingRegistrationSchema.index({ email: 1 });
PendingRegistrationSchema.index({ expiresAt: 1 });

export const PendingRegistration = mongoose.model<IPendingRegistration>(
  "PendingRegistration",
  PendingRegistrationSchema
);
