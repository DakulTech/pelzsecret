import fs from "fs";
import path from "path";
import multer from "multer";
import { asyncHandler, HttpError } from "../utils.js";

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads/");
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    // Allow only images
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
}).array("images", 5); // Field name 'images', max 5 files

// Helper function to format image data
const formatImageData = (file, index) => ({
    url: `/uploads/${file.filename}`,
    alt: path.parse(file.originalname).name, // Use filename without extension as alt
    isDefault: index === 0, // First image is default
});

// Upload controller
const uploadImagesController = asyncHandler(async (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, function (/** @type {any} */ err) {
      if (err instanceof multer.MulterError) {
        // Multer error handling
        if (err.code === "LIMIT_FILE_SIZE") {
          reject(new HttpError(400, "File size cannot exceed 5MB"));
        } else if (err.code === "LIMIT_FILE_COUNT") {
          reject(new HttpError(400, "Cannot upload more than 5 files"));
        } else {
          reject(new HttpError(400, err.message));
        }
      } else if (err) {
        // Other errors
        reject(new HttpError(400, err.message));
      } else {
        // Success case
        if (!req.files || req.files.length === 0) {
          reject(new HttpError(400, "No files were uploaded"));
          return;
        }

        // Format response
        const images = Array.isArray(req.files)
          ? req.files.map((file, index) => formatImageData(file, index))
          : [];
        res.status(200).json({ images });
        resolve();
      }
    });
  });
});

// Delete uploaded image
const deleteImageController = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(process.cwd(), "uploads", filename);

  if (!fs.existsSync(filepath)) {
    throw new HttpError(404, "Image not found");
  }

  fs.unlinkSync(filepath);
  res.status(200).json({ message: "Image deleted successfully" });
});

export { uploadImagesController, deleteImageController };
