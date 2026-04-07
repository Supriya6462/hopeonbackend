import mongoose, { Document } from "mongoose";

const BLOCK_TYPES = ["DONATION", "PAYOUT"] as const;

export type BlockchainBlockType = (typeof BLOCK_TYPES)[number];

export interface IBlockchainBlock extends Document {
  index: number;
  timestamp: string;
  type: BlockchainBlockType;
  data: Record<string, unknown>;
  previousHash: string;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlockchainBlockSchema = new mongoose.Schema<IBlockchainBlock>(
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

function appendOnlyError() {
  throw new Error(
    "Blockchain blocks are append-only. Updates or deletes are not allowed.",
  );
}

BlockchainBlockSchema.pre("save", function preSave() {
  if (!this.isNew) {
    appendOnlyError();
  }
});

const mutationHooks: Array<
  | "updateOne"
  | "updateMany"
  | "findOneAndUpdate"
  | "replaceOne"
  | "deleteOne"
  | "deleteMany"
  | "findOneAndDelete"
  | "findOneAndRemove"
  | "findByIdAndUpdate"
  | "findByIdAndDelete"
> = [
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
];

mutationHooks.forEach((hook) => {
  (BlockchainBlockSchema as any).pre(hook, function denyMutation() {
    appendOnlyError();
  });
});

BlockchainBlockSchema.index({ "data.campaignId": 1, index: 1 });

export const BlockchainBlock = mongoose.model<IBlockchainBlock>(
  "BlockchainBlock",
  BlockchainBlockSchema,
);
