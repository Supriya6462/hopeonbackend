import mongoose, { Schema, Document } from "mongoose";
import { CryptoNetwork, DonationStatus, PaymentProvider } from "../types/enums";

export interface IDonation extends Document {
  _id: mongoose.Types.ObjectId;
  campaign: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  donorEmail: string;
  amount: number;
  currency: 'NPR' | 'USD' | 'ETH' | 'USDT' | 'BTC';
  amountInUSD?: number | null;
  exchangeRateUsed?: number | null;
  platformFee:number;
  netAmount: number;
  method: PaymentProvider;
  status: DonationStatus;
  transactionId?: string | null;
  payerEmail?: string | null;
  payerName?: string | null;
  payerCountry?: string | null;
  captureDetails?: any | null;
  cryptoCurrency?: "ETH" | "USDT" | "BTC" | null;
  transactionHash?: string | null;
  network?: CryptoNetwork | null;
  blockConfirmations?: number | null;
  blockNumber?: number | null;
  paymentInitiatedAt?: Date | null;
  paymentVerifiedAt?: Date | null;
  failedReason?: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    donorEmail: { type: String, required: true, trim: true },

    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ['NPR', 'USD', 'ETH', 'USDT', 'BTC'], required: true },
    amountInUSD: { type: Number, default: null },
    exchangeRateUsed: { type: Number, default: null },

    platformFee: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },

    method: { type: String, enum: Object.values(PaymentProvider), default: null },
    status: { type: String, enum: Object.values(DonationStatus), default: DonationStatus.PENDING },

    transactionId: { type: String, default: null },
    payerEmail: { type: String, default: null },
    payerName: { type: String, default: null },
    payerCountry: { type: String, default: null },
    captureDetails: { type: Schema.Types.Mixed, default: null },

    cryptoCurrency: { type: String, enum: ["ETH", "USDT", "BTC"], default: null },
    transactionHash: { type: String, default: null },
    network: { type: String, enum: Object.values(CryptoNetwork), default: null },
    blockConfirmations: { type: Number, default: null },
    blockNumber: { type: Number, default: null },

    paymentInitiatedAt: { type: Date, default: null },
    paymentVerifiedAt: { type: Date, default: null },
    failedReason: { type: String, default: null }, 
  },{ timestamps: true, versionKey: false }
);

DonationSchema.index({ campaign: 1, status: 1 });
DonationSchema.index({ donor: 1, status: 1 });
DonationSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
DonationSchema.index({ transactionHash: 1 }, { unique: true, sparse: true });
DonationSchema.index({ createdAt: -1 });

export const Donation = mongoose.model<IDonation>("Donation", DonationSchema);