import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";

import { config } from "../config.js";
import { cloudinary } from "../cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { Media } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";

export const mediaRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const allowed = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    callback(allowed ? null : new Error("Only images and PDF files are allowed"), allowed);
  },
});

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

    const result = await uploadToCloudinary(req.file);
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

mediaRouter.get(
  "/files/:id/:filename?",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Catalogue not found" });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "catalogues",
    });
    const id = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: id }).toArray();
    const file = files[0];
    if (!file) return res.status(404).json({ message: "Catalogue not found" });

    const safeName = String(file.filename || "catalogue.pdf").replace(/["\\\r\n]/g, "_");
    res.setHeader("Content-Type", file.contentType || "application/pdf");
    res.setHeader("Content-Length", file.length);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    bucket.openDownloadStream(id).on("error", (error) => res.destroy(error)).pipe(res);
  }),
);

mediaRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: "Media not found" });

    if (media.public_id.startsWith("gridfs:")) {
      const id = media.public_id.slice("gridfs:".length);
      if (mongoose.isValidObjectId(id)) {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: "catalogues",
        });
        await bucket.delete(new mongoose.Types.ObjectId(id)).catch(() => null);
      }
    } else {
      await cloudinary.uploader
        .destroy(media.public_id, { resource_type: media.resource_type || "image" })
        .catch(() => null);
    }
    await media.deleteOne();
    res.json({ message: "Media deleted" });
  }),
);

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const isPdf = file.mimetype === "application/pdf";
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: config.cloudinary.folder,
        resource_type: isPdf ? "raw" : "image",
        use_filename: true,
        unique_filename: true,
        filename_override: file.originalname,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(file.buffer);
  });
}
