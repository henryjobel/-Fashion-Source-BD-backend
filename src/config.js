import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongodbUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev_only_change_me",
  adminEmail: process.env.ADMIN_EMAIL || "admin@fashionsourcebd.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin12345",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || "fashion-source-bd",
  },
};
