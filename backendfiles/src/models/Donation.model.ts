import mongoose, { Schema, Document } from "mongoose";
import { CryptoNetwork, DonationMethod, DonationStatus } from "../types/enums";

export interface IDonation extends Document {
  _id: mongoose.Types.ObjectId;
  campaign: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  donorEmail: string;
  amount: number;
  method: DonationMethod;
  transactionId?: string;
  payerEmail?: string;
  payerName?: string;
  payerCountry?: string;
  captureDetails?: any;
  cryptoCurrency?: "ETH" | "USDT" | "BTC";
  transactionHash?: string;
  network?: CryptoNetwork;
  status: DonationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    donorEmail: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: Object.values(DonationMethod), default: DonationMethod.PAYPAL },
    transactionId: { type: String, default: null },
    payerEmail: { type: String, default: null },
    payerName: { type: String, default: null },
    payerCountry: { type: String, default: null },
    captureDetails: { type: Schema.Types.Mixed, default: null },
    cryptoCurrency: { type: String, enum: ["ETH", "USDT", "BTC"], default: null },
    transactionHash: { type: String, default: null },
    network: { type: String, enum: Object.values(CryptoNetwork), default: null },
    status: { type: String, enum: Object.values(DonationStatus), default: DonationStatus.PENDING },
  },
  { timestamps: true, versionKey: false }
);

DonationSchema.index({ campaign: 1 });
DonationSchema.index({ donor: 1 });
DonationSchema.index({ transactionId: 1 });
DonationSchema.index({ transactionHash: 1 });

export const Donation = mongoose.model<IDonation>("Donation", DonationSchema);