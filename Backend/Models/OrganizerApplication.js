import mongoose from "mongoose";

const OrganizerApplicationStatusEventSchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "revoked", null],
      default: null,
    },
    toStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "revoked"],
      required: true,
    },
    changedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const OrganizerApplicationSchema = new mongoose.Schema(
  {
    // Reference to the User who submitted the application
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The name of the organization or group
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },

    // A description of why this user wants to be an organizer
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Additional contact information
    contactEmail: {
      type: String,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    // Organization details
    organizationType: {
      type: String,
      enum: ["nonprofit", "charity", "individual", "business", "other"],
      default: "other",
    },

    // Verification Documents (NEW)
    documents: {
      // Identity Verification
      governmentId: {
        url: String,
        publicId: String, // Cloudinary public ID for deletion
        uploadedAt: Date,
      },
      selfieWithId: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },

      // Organization Verification
      registrationCertificate: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },
      taxId: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },

      // Address Proof
      addressProof: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },

      // Supporting Documents (optional)
      additionalDocuments: [
        {
          name: String,
          url: String,
          publicId: String,
          uploadedAt: Date,
        },
      ],
    },

    // Document verification status
    documentsVerified: {
      type: Boolean,
      default: false,
    },

    // Current status of the application
    // "draft" = incomplete (not yet visible to admin)
    // "pending" = submitted with documents (visible to admin)
    // "approved" = admin approved
    // "rejected" = admin rejected
    // "revoked" = admin revoked after approval
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "revoked"],
      default: "draft",
      required: true,
      index: true,
    },

    // Reference to the admin (User) who reviewed this application (set when approved/rejected)
    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Timestamp when the application was reviewed (set when approved/rejected)
    reviewedAt: {
      type: Date,
    },

    // If the application was rejected, an (optional) reason for rejection
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    // Admin notes during review
    adminNotes: {
      type: String,
      trim: true,
    },

    statusHistory: {
      type: [OrganizerApplicationStatusEventSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

// Indexes for performance
OrganizerApplicationSchema.index({ user: 1, status: 1 });
OrganizerApplicationSchema.index({ status: 1, createdAt: -1 });
OrganizerApplicationSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "uniq_pending_application_per_user",
  },
);

const OrganizerApplication = mongoose.model(
  "OrganizerApplication",
  OrganizerApplicationSchema,
);

export default OrganizerApplication;
