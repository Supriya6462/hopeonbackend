import mongoose from "mongoose";

const BLOCK_TYPES = ["DONATION", "PAYOUT"];

const BlockchainBlockSchema = new mongoose.Schema(
  {
    index: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 0,
    },
    timestamp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: BLOCK_TYPES,
      required: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    previousHash: {
      type: String,
      required: true,
      index: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

function appendOnlyError(next) {
  next(
    new Error(
      "Blockchain blocks are append-only. Updates or deletes are not allowed.",
    ),
  );
}

BlockchainBlockSchema.pre("save", function preSave(next) {
  if (!this.isNew) {
    return appendOnlyError(next);
  }

  return next();
});

[
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndRemove",
  "findByIdAndUpdate",
  "findByIdAndDelete",
].forEach((hook) => {
  BlockchainBlockSchema.pre(hook, function denyMutation(next) {
    appendOnlyError(next);
  });
});

BlockchainBlockSchema.index({ "data.campaignId": 1, index: 1 });

const BlockchainBlock = mongoose.model("BlockchainBlock", BlockchainBlockSchema);

export default BlockchainBlock;
