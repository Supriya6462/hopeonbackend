import mongoose from "mongoose";
import { encrypt, decrypt, maskSensitiveData } from "../utils/encryption.js";

const WithdrawalRequestSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizerProfile: {
      type: mongoose.Types.ObjectId,
      ref: "OrganizerProfile",
      default: null,
      index: true,
    },
    campaign: {
      type: mongoose.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    availableBalanceSnapshot: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRaisedSnapshot: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawnSnapshot: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "completed"],
      default: "pending",
      index: true,
    },
    // Bank Account Details (sensitive data encrypted)
    bankDetails: {
      accountHolderName: { type: String, required: true, trim: true },
      bankName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
      accountNumberLast4: { type: String },
      routingNumber: { type: String, trim: true },
      swiftCode: { type: String, trim: true },
      iban: { type: String, trim: true },
      accountType: {
        type: String,
        enum: ["savings", "checking", "business"],
        required: true,
      },
      bankAddress: { type: String, trim: true },
      bankCountry: { type: String, required: true, trim: true },
    },
    // KYC Documents
    documents: {
      governmentId: {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["passport", "drivers_license", "national_id"],
          required: true,
        },
        verified: { type: Boolean, default: false },
      },
      bankProof: {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["bank_statement", "bank_letter", "cancelled_check"],
          required: true,
        },
        verified: { type: Boolean, default: false },
      },
      addressProof: {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["utility_bill", "bank_statement", "government_letter"],
          required: true,
        },
        verified: { type: Boolean, default: false },
      },
      taxDocument: {
        url: { type: String },
        type: {
          type: String,
          enum: ["tax_id", "ssn", "ein", "vat_certificate"],
        },
        verified: { type: Boolean, default: false },
      },
    },
    // Personal Information for KYC
    kycInfo: {
      fullLegalName: { type: String, required: true, trim: true },
      dateOfBirth: { type: Date, required: true },
      nationality: { type: String, required: true, trim: true },
      address: {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
      },
      phoneNumber: { type: String, required: true, trim: true },
      taxId: { type: String, trim: true },
    },
    // Admin Review
    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    // Transaction Details
    transactionReference: { type: String, trim: true },
    payoutBlockchainHash: { type: String, trim: true, index: true },
    completedAt: Date,
    processingFee: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number },
  },
  { timestamps: true },
);

// Indexes for performance
WithdrawalRequestSchema.index({ organizer: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ reviewedBy: 1 });

// Encrypt sensitive bank data before saving
WithdrawalRequestSchema.pre("save", function () {
  const bankDetails = this.bankDetails as any;
  const kycInfo = this.kycInfo as any;

  // Calculate net amount
  if (this.isModified("amount") || this.isModified("processingFee")) {
    this.netAmount = this.amount - this.processingFee;
  }

  if (
    this.isModified("bankDetails.accountNumber") &&
    bankDetails?.accountNumber
  ) {
    const plainAccount = bankDetails.accountNumber;
    bankDetails.accountNumberLast4 = plainAccount.slice(-4);
    bankDetails.accountNumber = encrypt(plainAccount);
  }

  if (
    this.isModified("bankDetails.routingNumber") &&
    bankDetails?.routingNumber
  ) {
    bankDetails.routingNumber = encrypt(bankDetails.routingNumber);
  }

  if (this.isModified("bankDetails.swiftCode") && bankDetails?.swiftCode) {
    bankDetails.swiftCode = encrypt(bankDetails.swiftCode);
  }

  if (this.isModified("bankDetails.iban") && bankDetails?.iban) {
    bankDetails.iban = encrypt(bankDetails.iban);
  }

  if (this.isModified("kycInfo.taxId") && kycInfo?.taxId) {
    kycInfo.taxId = encrypt(kycInfo.taxId);
  }
});

WithdrawalRequestSchema.methods.getDecryptedBankDetails = function () {
  const bankDetails = this.bankDetails as any;

  return {
    ...(bankDetails?.toObject ? bankDetails.toObject() : bankDetails),
    accountNumber: bankDetails?.accountNumber
      ? decrypt(bankDetails.accountNumber)
      : null,
    routingNumber: bankDetails?.routingNumber
      ? decrypt(bankDetails.routingNumber)
      : null,
    swiftCode: bankDetails?.swiftCode ? decrypt(bankDetails.swiftCode) : null,
    iban: bankDetails?.iban ? decrypt(bankDetails.iban) : null,
  };
};

WithdrawalRequestSchema.methods.getMaskedBankDetails = function () {
  const bankDetails = this.bankDetails as any;

  return {
    ...(bankDetails?.toObject ? bankDetails.toObject() : bankDetails),
    accountNumber: maskSensitiveData(
      bankDetails?.accountNumberLast4 || "****",
      4,
    ),
    routingNumber: bankDetails?.routingNumber ? "****" : null,
    swiftCode: bankDetails?.swiftCode ? "****" : null,
    iban: bankDetails?.iban ? "****" : null,
  };
};

export const WithdrawalRequest = mongoose.model(
  "WithdrawalRequest",
  WithdrawalRequestSchema,
);
