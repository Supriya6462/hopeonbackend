import crypto from "crypto";

export function generateHmacSha256Hash(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64");
}

export function generateUniqueId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
