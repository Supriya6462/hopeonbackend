import { S3_BUCKET_NAME, s3Client } from "../config/s3";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
    url: string;
    key: string;
    uploadedAt: Date;
}

const generateS3Key = (folder: string, fileName: string): string => {
    const uniqueId = crypto.randomUUID();
    const extension = fileName.split(".").pop() || "file";
    return `${folder}/${uniqueId}.${extension}`;
};

export const uploadToS3 = async (
    buffer: Buffer,
    folder: string,
    fileName: string,
    contentType: string
): Promise<UploadResult> => {
    const key = generateS3Key(folder, fileName);

    await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,

    }));

    const region = process.env.AWS_REGION || "eu-north-1";
    const url = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

    return {url, key, uploadedAt: new Date()};
};

export const deleteFromS3 = async (key: string): Promise<void> => {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
    }))
};

export const ALLOWED_DOCUMENT_TYPES = [
"image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];


export const MAX_FILE_SIZE = 10 * 1024 * 1024; //10MB