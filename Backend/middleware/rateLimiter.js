import { checkRateLimit } from "../utils/validation.js";
import { logSecurityEvent } from "../utils/logger.js";

// In-memory store (use Redis in production)
const rateLimitStore = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Clear rate limit for a specific key (useful for testing)
 * @param {string} key - Rate limit key to clear
 */
export function clearRateLimit(key) {
  rateLimitStore.delete(key);
  console.log(`Rate limit cleared for: ${key}`);
}

/**
 * Clear all rate limits (useful for development)
 */
export function clearAllRateLimits() {
  const count = rateLimitStore.size;
  rateLimitStore.clear();
  console.log(`Cleared ${count} rate limit entries`);
}

/**
 * Rate limiting middleware factory
 * @param {Object} options - Rate limit options
 * @param {number} options.maxAttempts - Maximum attempts allowed
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.keyGenerator - Function to generate rate limit key
 * @returns {Function} Express middleware
 */
export function createRateLimiter(options = {}) {
  const {
    maxAttempts = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyGenerator = (req) => req.ip,
    message = "Too many requests, please try again later",
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = checkRateLimit(rateLimitStore, key, maxAttempts, windowMs);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxAttempts);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", result.resetTime.toISOString());

    if (!result.allowed) {
      logSecurityEvent("Rate limit exceeded", {
        key,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      return res.status(429).json({
        message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints (login, password reset)
 * Adjusted for development and testing - more lenient than production
 */
export const strictRateLimiter = createRateLimiter({
  maxAttempts: process.env.NODE_ENV === "production" ? 5 : 20, // 20 in dev, 5 in prod
  windowMs: process.env.NODE_ENV === "production" ? 15 * 60 * 1000 : 5 * 60 * 1000, // 5 min in dev, 15 min in prod
  message: "Too many attempts, please try again later",
});

/**
 * Standard rate limiter for API endpoints
 * Very lenient for development, reasonable for production
 */
export const apiRateLimiter = createRateLimiter({
  maxAttempts: process.env.NODE_ENV === "production" ? 200 : 1000, // 1000 in dev, 200 in prod
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Upload rate limiter (stricter for file uploads)
 */
export const uploadRateLimiter = createRateLimiter({
  maxAttempts: process.env.NODE_ENV === "production" ? 10 : 50, // 50 in dev, 10 in prod
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many file uploads, please try again later",
});
