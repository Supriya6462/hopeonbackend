import mongoose, { Schema, Document } from "mongoose";
import { PayoutMethod, WithdrawalStatus } from "../types/enums";

export interface IWithdrawalRequest extends Document {
  _id: mongoose.Types.ObjectId;
  organizer: mongoose.Types.ObjectId;
  campaign: mongoose.Types.ObjectId;
  amountRequested: number;
  payoutMethod: PayoutMethod;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    branchName?: string;
    swiftCode?: string;
  };
  paypalEmail?: string;
  cryptoDetails?: {
    walletAddress?: string;
    network?: string;
  };
  reason?: string;
  status: WithdrawalStatus;
  adminMessage?: string;
  paidAt?: Date;
  paymentReference?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    organizer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    amountRequested: { type: Number, required: true, min: 0.01 },
    payoutMethod: { type: String, enum: Object.values(PayoutMethod), required: true },
    bankDetails: {
      accountHolderName: { type: String, default: null },
      bankName: { type: String, default: null },
      accountNumber: { type: String, default: null },
      branchName: { type: String, default: null },
      swiftCode: { type: String, default: null },
    },
    paypalEmail: { type: String, default: null },
    cryptoDetails: {
      walletAddress: { type: String, default: null },
      network: { type: String, default: null },
    },
    reason: { type: String, default: null },
    status: { type: String, enum: Object.values(WithdrawalStatus), default: WithdrawalStatus.PENDING },
    adminMessage: { type: String, default: null },
    paidAt: { type: Date, default: null },
    paymentReference: { type: String, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false }
);

WithdrawalRequestSchema.index({ organizer: 1 });
WithdrawalRequestSchema.index({ campaign: 1 });
WithdrawalRequestSchema.index({ status: 1 });

export const WithdrawalRequest = mongoose.model<IWithdrawalRequest>("WithdrawalRequest", WithdrawalRequestSchema);