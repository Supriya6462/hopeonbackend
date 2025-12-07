import mongoose, { Schema, Document } from "mongoose";
import { ApplicationStatus, OrganizationType } from "../types/enums";

export interface IOrganizerApplication extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  organizationName: string;
  description: string;
  contactEmail?: string;
  phoneNumber?: string;
  website?: string;
  organizationType: OrganizationType;
  documents?: {
    governmentId?: { url?: string; publicId?: string; uploadedAt?: Date };
    selfieWithId?: { url?: string; publicId?: string; uploadedAt?: Date };
    registrationCertificate?: { url?: string; publicId?: string; uploadedAt?: Date };
    taxId?: { url?: string; publicId?: string; uploadedAt?: Date };
    addressProof?: { url?: string; publicId?: string; uploadedAt?: Date };
    additionalDocuments?: Array<{ name?: string; url?: string; publicId?: string; uploadedAt?: Date }>;
  };
  documentsVerified: boolean;
  status: ApplicationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizerApplicationSchema = new Schema<IOrganizerApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationName: { type: String, required: true, trim: true, maxLength: 200 },
    description: { type: String, required: true, trim: true, maxLength: 2000 },
    contactEmail: { type: String, trim: true, default: null },
    phoneNumber: { type: String, trim: true, default: null },
    website: { type: String, trim: true, default: null },
    organizationType: { type: String, enum: Object.values(OrganizationType), default: OrganizationType.OTHER },
    documents: {
      governmentId: { url: String, publicId: String, uploadedAt: Date },
      selfieWithId: { url: String, publicId: String, uploadedAt: Date },
      registrationCertificate: { url: String, publicId: String, uploadedAt: Date },
      taxId: { url: String, publicId: String, uploadedAt: Date },
      addressProof: { url: String, publicId: String, uploadedAt: Date },
      additionalDocuments: [{ name: String, url: String, publicId: String, uploadedAt: Date }],
    },
    documentsVerified: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(ApplicationStatus), default: ApplicationStatus.PENDING },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: null },
    adminNotes: { type: String, trim: true, default: null },
  },
  { timestamps: true, versionKey: false }
);

OrganizerApplicationSchema.index({ user: 1 });
OrganizerApplicationSchema.index({ status: 1 });

export const OrganizerApplication = mongoose.model<IOrganizerApplication>("OrganizerApplication", OrganizerApplicationSchema);