import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Category, Product } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { slugify } from "../utils/slug.js";

export const productsRouter = Router();

const productSchema = z.object({
  category_id: z.union([z.string(), z.number()]).nullable().optional(),
  category: z.string().nullable().optional(),
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
    const slug = slugify(body.slug || body.name);
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
    const slug = body.slug ? slugify(body.slug) : undefined;
    const category = body.category || body.category_slug ? await resolveCategory(body) : undefined;
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

async function resolveCategory(body) {
  if (body.category) return body.category;
  if (body.category_id) return String(body.category_id);
  if (body.category_slug) {
    const category = await Category.findOne({ slug: body.category_slug });
    return category?._id || null;
  }
  return null;
}

function formatProduct(product) {
  const value = product.toJSON();
  value.category_id = value.category?.id || null;
  value.category_slug = value.category?.slug || "";
  value.category_title = value.category?.title || "";
  return value;
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
