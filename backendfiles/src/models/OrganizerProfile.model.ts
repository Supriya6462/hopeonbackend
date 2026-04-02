import mongoose from "mongoose";
import { encrypt, decrypt, maskSensitiveData } from "../utils/encryption.js";

const OrganizerProfileSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verifiedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
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
    documents: {
      governmentId: {
        url: { type: String, required: true },
        key: { type: String, trim: true },
        type: {
          type: String,
          enum: ["passport", "drivers_license", "national_id"],
          required: true,
        },
      },
      bankProof: {
        url: { type: String, required: true },
        key: { type: String, trim: true },
        type: {
          type: String,
          enum: ["bank_statement", "bank_letter", "cancelled_check"],
          required: true,
        },
      },
      addressProof: {
        url: { type: String, required: true },
        key: { type: String, trim: true },
        type: {
          type: String,
          enum: ["utility_bill", "bank_statement", "government_letter"],
          required: true,
        },
      },
      taxDocument: {
        url: { type: String },
        key: { type: String, trim: true },
        type: {
          type: String,
          enum: ["tax_id", "ssn", "ein", "vat_certificate"],
        },
      },
    },
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
  },
  { timestamps: true },
);

OrganizerProfileSchema.index({ verificationStatus: 1, updatedAt: -1 });

OrganizerProfileSchema.pre("save", function () {
  const bankDetails = this.bankDetails as any;
  const kycInfo = this.kycInfo as any;

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

OrganizerProfileSchema.methods.getDecryptedBankDetails = function () {
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

OrganizerProfileSchema.methods.getMaskedBankDetails = function () {
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

const OrganizerProfile = mongoose.model(
  "OrganizerProfile",
  OrganizerProfileSchema,
);

export default OrganizerProfile;
