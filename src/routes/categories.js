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
  catalogue_url: z.string().optional().nullable(),
  catalogue_name: z.string().optional().nullable(),
  parent: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  status: z.enum(["active", "draft"]).optional(),
});

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await Category.find().populate("parent").sort({ sort_order: 1, createdAt: 1 });
    res.json({ data: rows.map(formatCategory) });
  }),
);

categoriesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = categorySchema.parse(req.body);
    const slug = slugify(body.slug || body.title);
    const parent = await resolveParent(body.parent, null);

    const category = await Category.create({
      slug,
      title: body.title,
      intro: body.intro || "",
      description: body.description || "",
      catalogue_url: body.catalogue_url || "",
      catalogue_name: body.catalogue_name || "",
      parent,
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
    const parent =
      body.parent !== undefined ? await resolveParent(body.parent, req.params.id) : undefined;

    const updates = removeUndefined({ ...body, slug, parent });
    await Category.findByIdAndUpdate(req.params.id, updates, { runValidators: true });

    res.json({ message: "Category updated" });
  }),
);

categoriesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    await Category.updateMany({ parent: req.params.id }, { parent: null });
    res.json({ message: "Category deleted" });
  }),
);

async function resolveParent(parentId, selfId) {
  if (!parentId) return null;
  if (selfId && parentId === selfId) {
    const error = new Error("A category cannot be its own parent");
    error.status = 400;
    throw error;
  }
  const parent = await Category.findById(parentId);
  return parent?._id || null;
}

function formatCategory(category) {
  const value = category.toJSON();
  value.parent_id = value.parent?.id || null;
  value.parent_slug = value.parent?.slug || "";
  value.parent_title = value.parent?.title || "";
  value.parent = value.parent_id;
  return value;
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
