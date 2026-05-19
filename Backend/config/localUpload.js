import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB || 5);
const MAX_IMAGE_SIZE_BYTES = Math.max(1, MAX_IMAGE_SIZE_MB) * 1024 * 1024;

export const uploadDirPath = path.resolve(process.cwd(), UPLOAD_DIR_NAME);

function ensureUploadDirectoryExists() {
  fs.mkdirSync(uploadDirPath, { recursive: true });
}

function getFileExtension(originalname) {
  return path.extname(originalname || "").toLowerCase();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadDirectoryExists();
      cb(null, uploadDirPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = getFileExtension(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  },
});

function fileFilter(req, file, cb) {
  const extension = getFileExtension(file.originalname);
  const isMimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
  const isExtensionAllowed = ALLOWED_EXTENSIONS.has(extension);

  if (!isMimeAllowed || !isExtensionAllowed) {
    const error = new Error(
      "Invalid file type. Allowed types: jpg, jpeg, png, gif, webp.",
    );
    error.code = "INVALID_FILE_TYPE";
    return cb(error, false);
  }

  return cb(null, true);
}

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
});

export function handleUploadError(error, res) {
  if (!error) return false;

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        message: `File too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`,
      });
      return true;
    }

    res.status(400).json({
      message: `Upload error: ${error.message}`,
    });
    return true;
  }

  if (error.code === "INVALID_FILE_TYPE") {
    res.status(400).json({ message: error.message });
    return true;
  }

  res.status(500).json({
    message: "Failed to store uploaded file. Please try again.",
  });
  return true;
}
