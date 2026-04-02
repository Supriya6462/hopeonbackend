import crypto from "node:crypto";
import multer from "multer";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  documentsDirPath,
  ensureDirectoryExists,
  getFileExtension,
} from "./multer.shared.js";

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureDirectoryExists(documentsDirPath);
      cb(null, documentsDirPath);
    } catch (error) {
      cb(error as Error, documentsDirPath);
    }
  },
  filename: (_req, file, cb) => {
    const extension = getFileExtension(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  },
});

const documentFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const extension = getFileExtension(file.originalname);
  const isMimeAllowed = ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype);
  const isExtensionAllowed = ALLOWED_DOCUMENT_EXTENSIONS.has(extension);

  if (!isMimeAllowed || !isExtensionAllowed) {
    const error = new Error(
      "Invalid file type. Allowed types: jpg, jpeg, png, webp, pdf, doc, docx.",
    ) as Error & { code?: string };
    error.code = "INVALID_FILE_TYPE";
    cb(error);
    return;
  }

  cb(null, true);
};

export const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES, files: 10 },
});

export const organizerDocumentFields = [
  { name: "governmentId", maxCount: 1 },
  { name: "selfieWithId", maxCount: 1 },
  { name: "registrationCertificate", maxCount: 1 },
  { name: "taxId", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "additionalDocuments", maxCount: 5 },
];
