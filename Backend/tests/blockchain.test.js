import test from "node:test";
import assert from "node:assert/strict";

import { Block, Blockchain, sha256 } from "../lib/blockchain.js";

test("sha256 returns deterministic digest", () => {
  const input = "donation:123|campaign:abc";
  const a = sha256(input);
  const b = sha256(input);

  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("block hash changes when payload changes", () => {
  const shared = {
    index: 1,
    timestamp: "2026-04-06T10:00:00.000Z",
    type: "DONATION",
    previousHash: "0",
  };

  const first = new Block({
    ...shared,
    data: { donorName: "A", amount: 100, campaignId: "cmp-1" },
  });

  const second = new Block({
    ...shared,
    data: { donorName: "A", amount: 101, campaignId: "cmp-1" },
  });

  assert.notEqual(first.hash, second.hash);
});

test("chain validity fails when a stored block is tampered", () => {
  const chain = new Blockchain();
  const donationBlock = chain.addBlock({
    type: "DONATION",
    data: { donorName: "Donor", amount: 50, campaignId: "cmp-1" },
  });
  chain.addBlock({
    type: "PAYOUT",
    data: { amount: 25, campaignId: "cmp-1", paidDate: "2026-04-06" },
  });

  assert.equal(chain.isChainValid(), true);

  donationBlock.data.amount = 60;
  assert.equal(chain.isChainValid(), false);
});
