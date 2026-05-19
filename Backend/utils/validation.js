/**
 * Input validation utilities
 * Provides sanitization and validation for user inputs
 */

import { createRequire } from "module";
import dns from "node:dns/promises";

const require = createRequire(import.meta.url);
const disposableEmailDomains = new Set(require("disposable-email-domains"));

const DNS_TIMEOUT_MS = 2500;

function withTimeout(promise, timeoutMs = DNS_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error("DNS lookup timeout");
        timeoutError.code = "ETIMEOUT";
        reject(timeoutError);
      }, timeoutMs);
    }),
  ]);
}

/**
 * Sanitize string input - remove dangerous characters
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== "string") return "";
  
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getEmailDomain(email) {
  if (typeof email !== "string") return "";

  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return "";

  return email.slice(atIndex + 1).toLowerCase().trim();
}

/**
 * Check if an email domain is disposable/temporary.
 * Includes parent-domain fallback so subdomains are also blocked.
 * @param {string} email - Email address
 * @returns {boolean} True when email uses a disposable domain
 */
export function isDisposableEmail(email) {
  if (typeof email !== "string") return false;

  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;

  const rawDomain = email.slice(atIndex + 1).toLowerCase().trim();
  if (!rawDomain) return false;

  if (disposableEmailDomains.has(rawDomain)) {
    return true;
  }

  const domainParts = rawDomain.split(".");
  for (let i = 1; i < domainParts.length - 1; i += 1) {
    const parentDomain = domainParts.slice(i).join(".");
    if (disposableEmailDomains.has(parentDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether email domain appears real/reachable.
 * Returns invalid when domain has no MX and no A/AAAA records.
 * Returns uncertain for transient DNS issues so registration can continue.
 * @param {string} email - Email address
 * @returns {Promise<{ isValid: boolean, isUncertain: boolean }>}
 */
export async function validateEmailDomainReachability(email) {
  if (typeof email !== "string") {
    return { isValid: false, isUncertain: false };
  }

  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    return { isValid: false, isUncertain: false };
  }

  const domain = email.slice(atIndex + 1).toLowerCase().trim();
  if (!domain) {
    return { isValid: false, isUncertain: false };
  }

  let mxTimedOut = false;

  try {
    const mxRecords = await withTimeout(dns.resolveMx(domain));
    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return { isValid: true, isUncertain: false };
    }
  } catch (error) {
    if (error?.code === "ETIMEOUT") {
      mxTimedOut = true;
    }
  }

  const domainMissingCodes = new Set([
    "ENOTFOUND",
    "ENODATA",
    "ESERVFAIL",
    "ENODOMAIN",
    "EREFUSED",
  ]);

  try {
    const [aRecords, aaaaRecords] = await Promise.allSettled([
      withTimeout(dns.resolve4(domain)),
      withTimeout(dns.resolve6(domain)),
    ]);

    const hasA =
      aRecords.status === "fulfilled" &&
      Array.isArray(aRecords.value) &&
      aRecords.value.length > 0;
    const hasAaaa =
      aaaaRecords.status === "fulfilled" &&
      Array.isArray(aaaaRecords.value) &&
      aaaaRecords.value.length > 0;

    if (hasA || hasAaaa) {
      return { isValid: true, isUncertain: false };
    }

    const aErrCode =
      aRecords.status === "rejected" ? aRecords.reason?.code : null;
    const aaaaErrCode =
      aaaaRecords.status === "rejected" ? aaaaRecords.reason?.code : null;

    if (
      (aErrCode && domainMissingCodes.has(aErrCode)) ||
      (aaaaErrCode && domainMissingCodes.has(aaaaErrCode))
    ) {
      return { isValid: false, isUncertain: false };
    }

    if (
      mxTimedOut ||
      aErrCode === "ETIMEOUT" ||
      aaaaErrCode === "ETIMEOUT"
    ) {
      return { isValid: true, isUncertain: true };
    }
  } catch {
    return { isValid: true, isUncertain: true };
  }

  return { isValid: false, isUncertain: false };
}

/**
 * Evaluate email suitability for OTP-based auth flows.
 * Returns a structured result so routes can map stable API error codes.
 * @param {string} email - Email address to validate
 * @returns {Promise<{ isValid: boolean, isUncertain: boolean, code: string, message: string }>}
 */
export async function validateEmailForOtp(email) {
  if (!isValidEmail(email)) {
    return {
      isValid: false,
      isUncertain: false,
      code: "INVALID_EMAIL_FORMAT",
      message: "Invalid email format.",
    };
  }

  if (isDisposableEmail(email)) {
    return {
      isValid: false,
      isUncertain: false,
      code: "DISPOSABLE_EMAIL_BLOCKED",
      message: "Please use a real personal or work email address.",
    };
  }

  const domainStatus = await validateEmailDomainReachability(email);
  if (!domainStatus.isValid) {
    return {
      isValid: false,
      isUncertain: false,
      code: "EMAIL_DOMAIN_UNREACHABLE",
      message:
        "This email domain does not look real. Please use a valid email address.",
    };
  }

  if (domainStatus.isUncertain) {
    return {
      isValid: true,
      isUncertain: true,
      code: "EMAIL_DOMAIN_UNCERTAIN",
      message:
        "We could not fully verify this email domain right now, but you can continue.",
    };
  }

  return {
    isValid: true,
    isUncertain: false,
    code: "EMAIL_ACCEPTED",
    message: "Email accepted.",
  };
}

/**
 * Validate phone number (international format)
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
}

/**
 * Validate amount (positive number with max 2 decimals)
 * @param {number|string} amount - Amount to validate
 * @returns {boolean} True if valid
 */
export function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < 1000000 && /^\d+(\.\d{1,2})?$/.test(amount.toString());
}

/**
 * Validate file upload
 * @param {Object} file - Multer file object
 * @param {string[]} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Max file size in bytes
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateFile(file, allowedTypes = [], maxSize = 10 * 1024 * 1024) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB` 
    };
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}` 
    };
  }
  
  // Check file extension matches MIME type
  const ext = file.originalname.split(".").pop().toLowerCase();
  const mimeToExt = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "application/pdf": ["pdf"],
  };
  
  const expectedExts = mimeToExt[file.mimetype];
  if (expectedExts && !expectedExts.includes(ext)) {
    return { 
      valid: false, 
      error: "File extension does not match file type" 
    };
  }
  
  return { valid: true };
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid
 */
export function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize and validate bank account number
 * @param {string} accountNumber - Account number
 * @returns {Object} { valid: boolean, sanitized: string, error: string }
 */
export function validateBankAccount(accountNumber) {
  if (!accountNumber) {
    return { valid: false, error: "Account number is required" };
  }
  
  // Remove spaces and dashes
  const sanitized = accountNumber.replace(/[\s\-]/g, "");
  
  // Check if it's alphanumeric and reasonable length
  if (!/^[A-Z0-9]{4,34}$/i.test(sanitized)) {
    return { 
      valid: false, 
      error: "Invalid account number format" 
    };
  }
  
  return { valid: true, sanitized };
}

/**
 * Rate limiting helper - check if action is allowed
 * @param {Map} store - Rate limit store
 * @param {string} key - Unique key (e.g., IP address, user ID)
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: Date }
 */
export function checkRateLimit(store, key, maxAttempts, windowMs) {
  const now = Date.now();
  const record = store.get(key);
  
  if (!record || now > record.resetTime) {
    // First attempt or window expired
    store.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxAttempts - 1, resetTime: new Date(now + windowMs) };
  }
  
  if (record.count >= maxAttempts) {
    // Rate limit exceeded
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: new Date(record.resetTime) 
    };
  }
  
  // Increment count
  record.count++;
  store.set(key, record);
  
  return { 
    allowed: true, 
    remaining: maxAttempts - record.count, 
    resetTime: new Date(record.resetTime) 
  };
}
