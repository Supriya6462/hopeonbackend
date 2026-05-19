import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["donor", "organizer", "admin"],
      default: "donor",
      required: true,
      index: true,
    },
    isOrganizerApproved: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    resetToken: String,
    resetTokenExpiry: Date,
  },
  { timestamps: true },
);

// Indexes for performance
UserSchema.index({ resetToken: 1 });

const User = mongoose.model("User", UserSchema);
export default User;
