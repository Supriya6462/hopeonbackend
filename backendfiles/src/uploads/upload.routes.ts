import { NextFunction, Request, Response, Router } from "express";
import {
  applyFileMetadataForResponse,
  handleUploadError,
  uploadSingleImage,
} from "../config/multer.js";

const router = Router();

const singleImageUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadSingleImage.single("image")(req, res, (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    applyFileMetadataForResponse(req);
    return next();
  });
};

router.post("/", singleImageUploadMiddleware, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No image file uploaded. Use form-data with field name 'image'.",
    });
  }

  const file = req.file as Express.Multer.File & {
    location?: string;
    key?: string;
  };

  const imageUrl = file.key
    ? `/${process.env.UPLOAD_DIR || "uploads"}/${file.key}`
    : null;

  return res.status(201).json({
    message: "Image uploaded successfully",
    imageUrl,
    imageFullUrl: file.location || null,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    key: file.key || null,
  });
});

export default router;
