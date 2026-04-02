import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import multer from "multer";

const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";

export const MAX_DOCUMENT_SIZE_MB = Number(
  process.env.MAX_DOCUMENT_SIZE_MB || 10,
);
export const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB || 5);

export const MAX_DOCUMENT_SIZE_BYTES =
  Math.max(1, MAX_DOCUMENT_SIZE_MB) * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES =
  Math.max(1, MAX_IMAGE_SIZE_MB) * 1024 * 1024;

export const uploadDirPath = path.resolve(process.cwd(), UPLOAD_DIR_NAME);
export const documentsDirPath = path.resolve(uploadDirPath, "documents");

export function getFileExtension(originalname: string) {
  return path.extname(originalname || "").toLowerCase();
}

export function ensureDirectoryExists(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildPublicPath(filePath: string) {
  const normalized = filePath.split(path.sep).join("/");
  return `/${UPLOAD_DIR_NAME}/${normalized}`;
}

function buildStorageKey(filePath: string) {
  return filePath.split(path.sep).join("/");
}

export function applyFileMetadataForResponse(req: Request) {
  const host = req.get("host");
  const protocol = req.protocol;

  const enrichFile = (file: Express.Multer.File, baseDir: string) => {
    const relativeFilePath = path.relative(baseDir, file.path);
    const publicPath = buildPublicPath(relativeFilePath);
    (
      file as Express.Multer.File & { location?: string; key?: string }
    ).location = `${protocol}://${host}${publicPath}`;
    (file as Express.Multer.File & { location?: string; key?: string }).key =
      buildStorageKey(relativeFilePath);
    return file;
  };

  if (req.file) {
    enrichFile(req.file, uploadDirPath);
  }

  if (req.files && typeof req.files === "object") {
    Object.values(req.files)
      .flat()
      .forEach((file) =>
        enrichFile(file as Express.Multer.File, uploadDirPath),
      );
  }
}

function handleCommonUploadError(error: unknown, res: Response, maxMb: number) {
  if (!error) return false;

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        message: `File too large. Maximum size is ${maxMb}MB.`,
      });
      return true;
    }

    res.status(400).json({
      message: `Upload error: ${error.message}`,
    });
    return true;
  }

  const err = error as Error & { code?: string };
  if (err.code === "INVALID_FILE_TYPE") {
    res.status(400).json({ message: err.message });
    return true;
  }

  res.status(500).json({
    message: "Failed to store uploaded file. Please try again.",
  });
  return true;
}

export function handleDocumentUploadError(error: unknown, res: Response) {
  return handleCommonUploadError(error, res, MAX_DOCUMENT_SIZE_MB);
}

export function handleUploadError(error: unknown, res: Response) {
  return handleCommonUploadError(error, res, MAX_IMAGE_SIZE_MB);
}
