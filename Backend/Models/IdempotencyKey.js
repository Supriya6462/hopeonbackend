import mongoose from "mongoose";

const IdempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    requestHash: {
      type: String,
      required: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      required: true,
      default: 200,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

IdempotencyKeySchema.index({ key: 1, user: 1, endpoint: 1 }, { unique: true });
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyKey = mongoose.model("IdempotencyKey", IdempotencyKeySchema);

export default IdempotencyKey;
