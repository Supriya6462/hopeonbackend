/**
 * Centralized logging utility
 * In production, replace with Winston, Pino, or similar
 */

const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Format log message with timestamp and level
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : "";
  return `[${timestamp}] ${level}: ${message} ${metaStr}`;
}

/**
 * Log error message
 */
export function logError(message, error = null, meta = {}) {
  const errorMeta = error ? { 
    error: error.message, 
    stack: isDevelopment ? error.stack : undefined,
    ...meta 
  } : meta;
  
  console.error(formatLog(LOG_LEVELS.ERROR, message, errorMeta));
  
  // In production, send to error tracking service (Sentry, etc.)
  if (!isDevelopment && process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: meta });
  }
}

/**
 * Log warning message
 */
export function logWarn(message, meta = {}) {
  console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
}

/**
 * Log info message
 */
export function logInfo(message, meta = {}) {
  console.log(formatLog(LOG_LEVELS.INFO, message, meta));
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message, meta = {}) {
  if (isDevelopment) {
    console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
  }
}

/**
 * Log security event (authentication failures, suspicious activity)
 */
export function logSecurityEvent(event, meta = {}) {
  const securityLog = formatLog("SECURITY", event, {
    timestamp: Date.now(),
    ...meta,
  });
  
  console.warn(securityLog);
  
  // In production, send to SIEM or security monitoring service
  if (!isDevelopment) {
    // Send to security monitoring
  }
}

/**
 * Log API request (for audit trail)
 */
export function logApiRequest(req, meta = {}) {
  if (!isDevelopment) {
    logInfo("API Request", {
      method: req.method,
      path: req.path,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      ...meta,
    });
  }
}
