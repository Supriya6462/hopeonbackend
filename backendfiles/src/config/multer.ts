import multer from "multer";
import { ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE } from "../utils/s3Upload.util";

const storage = multer.memoryStorage();

const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if(ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file types: ${file.mimetype}`));
    }
};

export const documentUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files:10},
});

export const organizerDocumentFields = [
  { name: "governmentId", maxCount: 1 },
  { name: "selfieWithId", maxCount: 1 },
  { name: "registrationCertificate", maxCount: 1 },
  { name: "taxId", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "additionalDocuments", maxCount: 5 },
];