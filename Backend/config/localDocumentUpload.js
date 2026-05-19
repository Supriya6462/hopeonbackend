import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
const MAX_DOCUMENT_SIZE_MB = Number(process.env.MAX_DOCUMENT_SIZE_MB || 10);
const MAX_DOCUMENT_SIZE_BYTES = Math.max(1, MAX_DOCUMENT_SIZE_MB) * 1024 * 1024;

const documentsDirPath = path.resolve(
  process.cwd(),
  UPLOAD_DIR_NAME,
  "documents",
);

function ensureDocumentsDirectoryExists() {
  fs.mkdirSync(documentsDirPath, { recursive: true });
}

function getFileExtension(originalname) {
  return path.extname(originalname || "").toLowerCase();
}

function buildPublicPath(filename) {
  return `/uploads/documents/${filename}`;
}

function buildStorageKey(filename) {
  return `documents/${filename}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureDocumentsDirectoryExists();
      cb(null, documentsDirPath);
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
      "Invalid file type. Allowed types: jpg, jpeg, png, webp, pdf, doc, docx.",
    );
    error.code = "INVALID_FILE_TYPE";
    return cb(error, false);
  }

  return cb(null, true);
}

const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 10,
  },
});

export const uploadSingleDocument = uploadDocuments;
export const uploadMultipleDocuments = uploadDocuments;

export function applyFileMetadataForResponse(req) {
  const host = req.get("host");
  const protocol = req.protocol;

  const enrichFile = (file) => {
    const publicPath = buildPublicPath(file.filename);
    file.location = `${protocol}://${host}${publicPath}`;
    file.key = buildStorageKey(file.filename);
    return file;
  };

  if (req.file) {
    enrichFile(req.file);
  }

  if (req.files && typeof req.files === "object") {
    Object.values(req.files)
      .flat()
      .forEach((file) => enrichFile(file));
  }
}

export function handleDocumentUploadError(error, res) {
  if (!error) return false;

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        message: `File too large. Maximum size is ${MAX_DOCUMENT_SIZE_MB}MB.`,
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
