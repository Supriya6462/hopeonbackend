import crypto from "crypto";

/**
 * Encryption utility for sensitive data (bank accounts, etc.)
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
let cachedKey = null;
let warnedInsecureFallback = false;

/**
 * Get encryption key from environment or generate one
 * In production, this should be stored in a secure key management service
 */
function getEncryptionKey() {
  if (cachedKey) {
    return cachedKey;
  }

  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be set in production");
    }

    if (!warnedInsecureFallback) {
      console.warn(
        "⚠️  WARNING: ENCRYPTION_KEY not set. Using default (INSECURE for production!)",
      );
      warnedInsecureFallback = true;
    }

    cachedKey = crypto.scryptSync(
      "default-key-change-in-production",
      "salt",
      32,
    );
    return cachedKey;
  }

  // Derive a 32-byte key from the environment variable
  cachedKey = crypto.scryptSync(key, "salt", 32);
  return cachedKey;
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted data in format: iv:authTag:encryptedData (hex encoded)
 */
export function encrypt(text) {
  if (!text) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error.message);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data in format: iv:authTag:encryptedData
 * @returns {string} Decrypted plain text
 */
export function decrypt(encryptedData) {
  if (!encryptedData) return null;

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data (one-way, for verification only)
 * @param {string} text - Text to hash
 * @returns {string} Hashed value
 */
export function hash(text) {
  if (!text) return null;

  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Mask sensitive data for display (e.g., account numbers)
 * @param {string} text - Text to mask
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} Masked text
 */
export function maskSensitiveData(text, visibleChars = 4) {
  if (!text || text.length <= visibleChars) return text;

  const masked = "*".repeat(text.length - visibleChars);
  const visible = text.slice(-visibleChars);

  return masked + visible;
}
