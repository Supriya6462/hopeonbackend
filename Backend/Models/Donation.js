import mongoose from "mongoose";

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
    customerDetails: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    product_name: {
      type: String,
      trim: true,
    },
    product_id: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["paypal", "esewa", "khalti", "manual"],
      default: "paypal",
    },
    payment_gateway: {
      type: String,
      enum: ["paypal", "esewa", "khalti"],
    },
    currency: {
      type: String,
      enum: ["USD", "NPR"],
      default: "USD",
    },
    paypalOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    khaltiPidx: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    transactionId: { type: String, required: true, unique: true, index: true },
    payerEmail: { type: String, lowercase: true, trim: true },
    payerName: String,
    payerCountry: String,
    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "FAILED", "REFUNDED"],
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

const Donation = mongoose.model("Donation", DonationSchema);
export default Donation;
