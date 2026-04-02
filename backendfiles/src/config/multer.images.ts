import crypto from "node:crypto";
import multer from "multer";
import {
  MAX_IMAGE_SIZE_BYTES,
  ensureDirectoryExists,
  getFileExtension,
  uploadDirPath,
} from "./multer.shared.js";

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureDirectoryExists(uploadDirPath);
      cb(null, uploadDirPath);
    } catch (error) {
      cb(error as Error, uploadDirPath);
    }
  },
  filename: (_req, file, cb) => {
    const extension = getFileExtension(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  },
});

const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const extension = getFileExtension(file.originalname);
  const isMimeAllowed = ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype);
  const isExtensionAllowed = ALLOWED_IMAGE_EXTENSIONS.has(extension);

  if (!isMimeAllowed || !isExtensionAllowed) {
    const error = new Error(
      "Invalid file type. Allowed types: jpg, jpeg, png, gif, webp.",
    ) as Error & { code?: string };
    error.code = "INVALID_FILE_TYPE";
    cb(error);
    return;
  }

  cb(null, true);
};

export const uploadSingleImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
});
