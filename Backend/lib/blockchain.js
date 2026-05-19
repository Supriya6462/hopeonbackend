import crypto from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

export class Block {
  constructor({ index, timestamp, type, data, previousHash }) {
    this.index = index;
    this.timestamp = timestamp;
    this.type = type;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const payload = {
      index: this.index,
      timestamp: this.timestamp,
      type: this.type,
      data: this.data,
      previousHash: this.previousHash,
    };

    return sha256(stableStringify(payload));
  }
}

export class Blockchain {
  constructor(blocks = []) {
    this.blocks = Array.isArray(blocks) ? blocks : [];
  }

  addBlock({ type, data }) {
    const previousBlock = this.blocks[this.blocks.length - 1] || null;
    const block = new Block({
      index: previousBlock ? previousBlock.index + 1 : 0,
      timestamp: new Date().toISOString(),
      type,
      data,
      previousHash: previousBlock ? previousBlock.hash : "0",
    });

    this.blocks.push(block);
    return block;
  }

  isChainValid() {
    for (let i = 0; i < this.blocks.length; i += 1) {
      const current = this.blocks[i];
      const expectedHash = sha256(
        stableStringify({
          index: current.index,
          timestamp: current.timestamp,
          type: current.type,
          data: current.data,
          previousHash: current.previousHash,
        }),
      );

      if (current.hash !== expectedHash) {
        return false;
      }

      if (i === 0) {
        if (current.previousHash !== "0") {
          return false;
        }
      } else if (current.previousHash !== this.blocks[i - 1].hash) {
        return false;
      }
    }

    return true;
  }
}

export function rebuildAsBlockchain(blocks = []) {
  return new Blockchain(
    blocks.map((block) => ({
      index: block.index,
      timestamp: block.timestamp,
      type: block.type,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
    })),
  );
}
