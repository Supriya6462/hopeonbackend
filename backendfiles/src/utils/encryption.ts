import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    "hopeon-dev-encryption-key";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plainText: string): string {
  if (!plainText) {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(cipherText: string): string {
  if (!cipherText) {
    return cipherText;
  }

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    return cipherText;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function maskSensitiveData(value: string, visibleDigits = 4): string {
  if (!value) {
    return value;
  }

  const visiblePart = value.slice(-visibleDigits);
  const maskedLength = Math.max(0, value.length - visibleDigits);
  return `${"*".repeat(maskedLength)}${visiblePart}`;
}
