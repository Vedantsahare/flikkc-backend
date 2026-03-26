import { v2 as cloudinary } from "cloudinary";

// Check if all required env variables exist
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("✅ Cloudinary configured successfully");
} else {
  console.warn("⚠️ Cloudinary not configured. Upload features will be disabled.");
}

// Export anyway so app doesn't crash
export default cloudinary;