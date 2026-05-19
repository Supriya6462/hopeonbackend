import mongoose, { mongo } from "mongoose";

const OtpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    otpCode: { type: String, required: true },
    purpose: { type: String, enum: ["register", "forget-password"] },
    expiresAt: Date,
    isUsed: { type: Boolean, default: false },                                               
}, { timestamps: true });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Otp = mongoose.model("Otp", OtpSchema);
export default Otp;