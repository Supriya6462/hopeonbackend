import mongoose, { Schema, Document } from "mongoose";
import { Role } from "../types/enums";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phoneNumber?: string;
  image?: string;
  isOrganizerApproved: boolean;
  isOrganizerRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revocationReason?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxLength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxLength: 100 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), default: Role.DONOR, required: true },
    phoneNumber: { type: String, trim: true, default: null },
    image: { type: String, default: null },
    isOrganizerApproved: { type: Boolean, default: false },
    isOrganizerRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    revocationReason: { type: String, trim: true, maxLength: 500, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

UserSchema.index({ email: 1 });
UserSchema.index({ isOrganizerApproved: 1 });
UserSchema.index({ isOrganizerRevoked: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);