import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Setting } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await Setting.find().sort({ key: 1 });
    res.json({
      data: Object.fromEntries(rows.map((row) => [row.key, row.value])),
    });
  }),
);

settingsRouter.put(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.record(z.string()).parse(req.body);
    for (const [key, value] of Object.entries(body)) {
      await Setting.updateOne({ key }, { $set: { value } }, { upsert: true });
    }
    res.json({ message: "Settings updated" });
  }),
);
