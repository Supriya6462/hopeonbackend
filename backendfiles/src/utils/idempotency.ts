import crypto from "node:crypto";
import IdempotencyKey from "../models/IdempotencyKey.js";

const IDEMPOTENCY_TTL_HOURS = 24;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`,
  );

  return `{${entries.join(",")}}`;
}

export function buildRequestHash(body: unknown) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(body ?? {}))
    .digest("hex");
}

export interface IdempotencyLookupResult {
  bypass?: boolean;
  conflict?: boolean;
  replay?: boolean;
  statusCode?: number;
  responseBody?: unknown;
}

interface GetStoredIdempotentResponseParams {
  idempotencyKey: string;
  userId: string;
  endpoint: string;
  requestHash: string;
}

export async function getStoredIdempotentResponse({
  idempotencyKey,
  userId,
  endpoint,
  requestHash,
}: GetStoredIdempotentResponseParams): Promise<IdempotencyLookupResult> {
  if (!idempotencyKey) {
    return { bypass: true };
  }

  const existing = await IdempotencyKey.findOne({
    key: idempotencyKey,
    user: userId,
    endpoint,
  });

  if (!existing) {
    return { bypass: false };
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

interface StoreIdempotentResponseParams {
  idempotencyKey: string;
  userId: string;
  endpoint: string;
  requestHash: string;
  statusCode: number;
  responseBody: unknown;
}

export async function storeIdempotentResponse({
  idempotencyKey,
  userId,
  endpoint,
  requestHash,
  statusCode,
  responseBody,
}: StoreIdempotentResponseParams): Promise<void> {
  if (!idempotencyKey) {
    return;
  }

  const expiresAt = new Date(
    Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
  );

  await IdempotencyKey.updateOne(
    { key: idempotencyKey, user: userId, endpoint },
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
