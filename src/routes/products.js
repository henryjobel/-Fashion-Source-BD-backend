import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Category, Product } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { slugify } from "../utils/slug.js";

export const productsRouter = Router();

const productSchema = z.object({
  category_id: z.union([z.string(), z.number()]).nullable().optional(),
  // Admin panel PUTs the product back as fetched, where category may be a
  // populated object — accept it and resolve to an id server-side.
  category: z
    .union([z.string(), z.object({ id: z.string().optional() }).passthrough()])
    .nullable()
    .optional(),
  category_slug: z.string().nullable().optional(),
  slug: z.string().optional(),
  name: z.string().min(1),
  short_name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  specs: z.array(z.string()).optional(),
  status: z.enum(["active", "draft"]).optional(),
  sort_order: z.number().int().optional(),
});

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await Product.find().populate("category").sort({ sort_order: 1, createdAt: -1 });
    res.json({ data: rows.map(formatProduct) });
  }),
);

productsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug }).populate("category");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ data: formatProduct(product) });
  }),
);

productsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const slug = await uniqueSlug(slugify(body.slug || body.name));
    const category = await resolveCategory(body);
    const product = await Product.create({
      category,
      slug,
      name: body.name,
      short_name: body.short_name || body.name,
      description: body.description || "",
      image_url: body.image_url || "",
      specs: body.specs || [],
      status: body.status || "active",
      sort_order: body.sort_order || 0,
    });
    res.status(201).json({ id: product.id, slug });
  }),
);

productsRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = productSchema.partial().parse(req.body);
    const slug = body.slug ? await uniqueSlug(slugify(body.slug), req.params.id) : undefined;
    const hasCategoryInput =
      body.category !== undefined ||
      body.category_id !== undefined ||
      body.category_slug !== undefined;
    const category = hasCategoryInput ? await resolveCategory(body) : undefined;
    await Product.findByIdAndUpdate(
      req.params.id,
      removeUndefined({ ...body, slug, category }),
      { runValidators: true },
    );
    res.json({ message: "Product updated" });
  }),
);

productsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  }),
);

// Slug ordering: the category select in the admin panel works off slugs, so a
// changed slug is the freshest signal; ids may be stale copies of the old value.
async function resolveCategory(body) {
  if (body.category_slug) {
    const category = await Category.findOne({ slug: body.category_slug });
    if (category) return category._id;
  }
  const raw =
    body.category_id ??
    (body.category && typeof body.category === "object" ? body.category.id : body.category);
  if (raw && mongoose.isValidObjectId(String(raw))) {
    const category = await Category.findById(String(raw));
    if (category) return category._id;
  }
  return null;
}

async function uniqueSlug(base, excludeId = null) {
  const root = base || "product";
  let candidate = root;
  for (let n = 2; ; n += 1) {
    const clash = await Product.exists(
      excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate },
    );
    if (!clash) return candidate;
    candidate = `${root}-${n}`;
  }
}

function formatProduct(product) {
  const value = product.toJSON();
  value.category_id = value.category?.id || null;
  value.category_slug = value.category?.slug || "";
  value.category_title = value.category?.title || "";
  value.category = value.category_id;
  return value;
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
