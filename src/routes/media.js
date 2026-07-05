import { Router } from "express";
import multer from "multer";

import { config } from "../config.js";
import { cloudinary } from "../cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { Media } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";

export const mediaRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

mediaRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await Media.find().sort({ createdAt: -1 });
    res.json({ data: rows });
  }),
);

mediaRouter.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const result = await uploadToCloudinary(req.file.buffer);
    const media = await Media.create({
      public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      folder: config.cloudinary.folder,
      alt_text: req.body.alt_text || "",
    });
    res.status(201).json({ id: media.id, data: result });
  }),
);

mediaRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: "Media not found" });

    await cloudinary.uploader.destroy(media.public_id, { resource_type: media.resource_type || "image" }).catch(() => null);
    await media.deleteOne();
    res.json({ message: "Media deleted" });
  }),
);

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: config.cloudinary.folder, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}
