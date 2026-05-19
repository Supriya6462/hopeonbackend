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
      accountNumber: { type: String, required: true, trim: true }, // Encrypted
      accountNumberLast4: { type: String }, // Last 4 digits for display
      routingNumber: { type: String, trim: true }, // Encrypted
      swiftCode: { type: String, trim: true }, // Encrypted
      iban: { type: String, trim: true }, // Encrypted
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
      taxId: { type: String, trim: true }, // SSN, EIN, VAT, etc.
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
    completedAt: Date,
    processingFee: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number }, // Amount after fees
  },
  { timestamps: true },
);

// Indexes for performance
WithdrawalRequestSchema.index({ organizer: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ reviewedBy: 1 });

// Encrypt sensitive bank data before saving
WithdrawalRequestSchema.pre("save", function (next) {
  try {
    // Calculate net amount
    if (this.isModified("amount") || this.isModified("processingFee")) {
      this.netAmount = this.amount - this.processingFee;
    }

    // Encrypt sensitive bank details
    if (
      this.isModified("bankDetails.accountNumber") &&
      this.bankDetails.accountNumber
    ) {
      // Store last 4 digits for display
      const plainAccount = this.bankDetails.accountNumber;
      this.bankDetails.accountNumberLast4 = plainAccount.slice(-4);
      // Encrypt full account number
      this.bankDetails.accountNumber = encrypt(plainAccount);
    }

    if (
      this.isModified("bankDetails.routingNumber") &&
      this.bankDetails.routingNumber
    ) {
      this.bankDetails.routingNumber = encrypt(this.bankDetails.routingNumber);
    }

    if (
      this.isModified("bankDetails.swiftCode") &&
      this.bankDetails.swiftCode
    ) {
      this.bankDetails.swiftCode = encrypt(this.bankDetails.swiftCode);
    }

    if (this.isModified("bankDetails.iban") && this.bankDetails.iban) {
      this.bankDetails.iban = encrypt(this.bankDetails.iban);
    }

    // Encrypt tax ID
    if (this.isModified("kycInfo.taxId") && this.kycInfo.taxId) {
      this.kycInfo.taxId = encrypt(this.kycInfo.taxId);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to get decrypted bank details (admin only)
WithdrawalRequestSchema.methods.getDecryptedBankDetails = function () {
  return {
    ...this.bankDetails.toObject(),
    accountNumber: decrypt(this.bankDetails.accountNumber),
    routingNumber: this.bankDetails.routingNumber
      ? decrypt(this.bankDetails.routingNumber)
      : null,
    swiftCode: this.bankDetails.swiftCode
      ? decrypt(this.bankDetails.swiftCode)
      : null,
    iban: this.bankDetails.iban ? decrypt(this.bankDetails.iban) : null,
  };
};

// Method to get masked bank details (for organizer view)
WithdrawalRequestSchema.methods.getMaskedBankDetails = function () {
  return {
    ...this.bankDetails.toObject(),
    accountNumber: maskSensitiveData(
      this.bankDetails.accountNumberLast4 || "****",
      4,
    ),
    routingNumber: this.bankDetails.routingNumber ? "****" : null,
    swiftCode: this.bankDetails.swiftCode ? "****" : null,
    iban: this.bankDetails.iban ? "****" : null,
  };
};

const WithdrawalRequest = mongoose.model(
  "WithdrawalRequest",
  WithdrawalRequestSchema,
);
export default WithdrawalRequest;
