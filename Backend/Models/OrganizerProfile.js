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

OrganizerProfileSchema.pre("save", function (next) {
  try {
    if (
      this.isModified("bankDetails.accountNumber") &&
      this.bankDetails.accountNumber
    ) {
      const plainAccount = this.bankDetails.accountNumber;
      this.bankDetails.accountNumberLast4 = plainAccount.slice(-4);
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

    if (this.isModified("kycInfo.taxId") && this.kycInfo.taxId) {
      this.kycInfo.taxId = encrypt(this.kycInfo.taxId);
    }

    next();
  } catch (error) {
    next(error);
  }
});

OrganizerProfileSchema.methods.getDecryptedBankDetails = function () {
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

OrganizerProfileSchema.methods.getMaskedBankDetails = function () {
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

const OrganizerProfile = mongoose.model(
  "OrganizerProfile",
  OrganizerProfileSchema,
);

export default OrganizerProfile;
