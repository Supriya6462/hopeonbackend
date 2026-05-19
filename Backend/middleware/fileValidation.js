import { validateFile } from "../utils/validation.js";
import { logError } from "../utils/logger.js";

/**
 * File validation middleware
 * Validates uploaded files for type, size, and security
 */

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const ALLOWED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate document uploads (for KYC, organizer applications)
 */
export function validateDocumentUpload(req, res, next) {
  // Check if files exist
  if (!req.file && !req.files) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Handle single file
  if (req.file) {
    const validation = validateFile(req.file, ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE);
    if (!validation.valid) {
      logError("File validation failed", null, {
        filename: req.file.originalname,
        error: validation.error,
      });
      return res.status(400).json({ message: validation.error });
    }
  }

  // Handle multiple files
  if (req.files) {
    const files = Array.isArray(req.files) 
      ? req.files 
      : Object.values(req.files).flat();

    for (const file of files) {
      const validation = validateFile(file, ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE);
      if (!validation.valid) {
        logError("File validation failed", null, {
          filename: file.originalname,
          error: validation.error,
        });
        return res.status(400).json({ 
          message: `${file.originalname}: ${validation.error}` 
        });
      }
    }
  }

  next();
}

/**
 * Validate image uploads (for campaign images)
 */
export function validateImageUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const validation = validateFile(req.file, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE);
  if (!validation.valid) {
    logError("Image validation failed", null, {
      filename: req.file.originalname,
      error: validation.error,
    });
    return res.status(400).json({ message: validation.error });
  }

  next();
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special chars
    .replace(/\.{2,}/g, ".") // Remove multiple dots
    .slice(0, 255); // Limit length
}
