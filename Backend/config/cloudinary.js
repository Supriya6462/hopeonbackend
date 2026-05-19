import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for verification documents
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "fundraising/organizer-verifications", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
    max_file_size: 10 * 1024 * 1024, // 10MB max file size
    transformation: [{ width: 2000, height: 2000, crop: "limit" }], // Optimize images
  },
});

// Multer upload middleware
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (JPG, PNG) and documents (PDF, DOC) are allowed!"));
    }
  },
});

// Function to delete a file from Cloudinary
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

export default cloudinary;

