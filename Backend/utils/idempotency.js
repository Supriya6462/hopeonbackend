import crypto from "crypto";
import IdempotencyKey from "../Models/IdempotencyKey.js";

const IDEMPOTENCY_TTL_HOURS = 24;

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`,
  );
  return `{${entries.join(",")}}`;
}

export function buildRequestHash(body) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(body || {}))
    .digest("hex");
}

export async function getStoredIdempotentResponse({
  idempotencyKey,
  userId,
  endpoint,
  requestHash,
}) {
  if (!idempotencyKey) {
    return { bypass: true };
  }

  const existing = await IdempotencyKey.findOne({
    key: idempotencyKey,
    user: userId,
    endpoint,
  });

  if (!existing) {
    return { bypass: false, existing: null };
  }

  if (existing.requestHash !== requestHash) {
    return {
      conflict: true,
      statusCode: 409,
      responseBody: {
        message:
          "Idempotency key was already used with a different request payload.",
      },
    };
  }

  return {
    replay: true,
    statusCode: existing.statusCode,
    responseBody: existing.responseBody,
  };
}

export async function storeIdempotentResponse({
  idempotencyKey,
  userId,
  endpoint,
  requestHash,
  statusCode,
  responseBody,
}) {
  if (!idempotencyKey) {
    return;
  }

  const expiresAt = new Date(
    Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
  );

  await IdempotencyKey.updateOne(
    {
      key: idempotencyKey,
      user: userId,
      endpoint,
    },
    {
      $setOnInsert: {
        key: idempotencyKey,
        user: userId,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
        expiresAt,
      },
    },
    { upsert: true },
  );
}
