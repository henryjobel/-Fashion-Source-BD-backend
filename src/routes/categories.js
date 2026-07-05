import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Category } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { slugify } from "../utils/slug.js";

export const categoriesRouter = Router();

const categorySchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  intro: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  status: z.enum(["active", "draft"]).optional(),
});

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await Category.find().sort({ sort_order: 1, createdAt: 1 });
    res.json({ data: rows });
  }),
);

categoriesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = categorySchema.parse(req.body);
    const slug = slugify(body.slug || body.title);

    const category = await Category.create({
      slug,
      title: body.title,
      intro: body.intro || "",
      description: body.description || "",
      sort_order: body.sort_order || 0,
      status: body.status || "active",
    });

    res.status(201).json({ id: category.id, slug });
  }),
);

categoriesRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = categorySchema.partial().parse(req.body);
    const slug = body.slug ? slugify(body.slug) : undefined;

    const updates = removeUndefined({ ...body, slug });
    await Category.findByIdAndUpdate(req.params.id, updates, { runValidators: true });

    res.json({ message: "Category updated" });
  }),
);

categoriesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  }),
);

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
