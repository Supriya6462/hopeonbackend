import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface UploadResult {
  url: string;
  key: string;
  uploadedAt: Date;
}

const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR || "uploads";
const UPLOAD_BASE_PATH = path.resolve(process.cwd(), UPLOAD_DIR_NAME);
const BACKEND_BASE_URL =
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;

const generateStorageKey = (folder: string, fileName: string): string => {
  const uniqueId = crypto.randomUUID();
  const extension = fileName.split(".").pop() || "file";
  return `${folder}/${uniqueId}.${extension}`;
};

export const uploadLocalFile = async (
  buffer: Buffer,
  folder: string,
  fileName: string,
  contentType: string,
): Promise<UploadResult> => {
  void contentType;
  const key = generateStorageKey(folder, fileName).split("/").join(path.sep);
  const filePath = path.resolve(UPLOAD_BASE_PATH, key);
  const fileDir = path.dirname(filePath);

  fs.mkdirSync(fileDir, { recursive: true });
  await fsPromises.writeFile(filePath, buffer);

  const urlPath = key.split(path.sep).join("/");
  const url = `${BACKEND_BASE_URL}/${UPLOAD_DIR_NAME}/${urlPath}`;

  return { url, key, uploadedAt: new Date() };
};

export const deleteLocalFile = async (key: string): Promise<void> => {
  const filePath = path.resolve(
    UPLOAD_BASE_PATH,
    key.split("/").join(path.sep),
  );
  await fsPromises.rm(filePath, { force: true });
};
