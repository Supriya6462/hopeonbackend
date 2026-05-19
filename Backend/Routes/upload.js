import { Router } from "express";
import { handleUploadError, uploadSingleImage } from "../config/localUpload.js";

const router = Router();

function singleImageUploadMiddleware(req, res, next) {
  uploadSingleImage.single("image")(req, res, (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    return next();
  });
}

router.post("/upload", singleImageUploadMiddleware, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No image file uploaded. Use form-data with field name 'image'.",
    });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  const imageFullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;

  return res.status(201).json({
    message: "Image uploaded successfully",
    imageUrl,
    imageFullUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

export default router;
