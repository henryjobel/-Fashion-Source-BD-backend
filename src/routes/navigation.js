import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { NavigationItem } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";

export const navigationRouter = Router();

const navItemSchema = z.object({
  location: z.enum(["header", "footer"]),
  label: z.string().min(1),
  url: z.string().optional().nullable(),
  parent: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  target_blank: z.boolean().optional(),
  status: z.enum(["active", "hidden"]).optional(),
});

navigationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.location) filter.location = req.query.location;
    const rows = await NavigationItem.find(filter).sort({ sort_order: 1, createdAt: 1 });
    res.json({ data: rows });
  }),
);

navigationRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = navItemSchema.parse(req.body);
    const item = await NavigationItem.create({
      location: body.location,
      label: body.label,
      url: body.url || "",
      parent: body.parent || null,
      group: body.group || "",
      sort_order: body.sort_order ?? 0,
      target_blank: body.target_blank ?? false,
      status: body.status || "active",
    });
    res.status(201).json({ id: item.id });
  }),
);

navigationRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = navItemSchema.partial().parse(req.body);
    const updates = removeUndefined({ ...body, parent: body.parent || null });
    await NavigationItem.findByIdAndUpdate(req.params.id, updates, { runValidators: true });
    res.json({ message: "Navigation item updated" });
  }),
);

navigationRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await NavigationItem.deleteMany({ $or: [{ _id: req.params.id }, { parent: req.params.id }] });
    res.json({ message: "Navigation item deleted" });
  }),
);

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
