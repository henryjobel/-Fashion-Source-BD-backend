import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Page } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";

export const pagesRouter = Router();

const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["published", "draft"]).optional(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  sections: z
    .array(
      z.object({
        section_key: z.string().min(1),
        label: z.string().min(1),
        section_type: z.string().optional(),
        content: z.unknown().optional(),
        sort_order: z.number().int().optional(),
      }),
    )
    .optional(),
});

pagesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const pages = await Page.find().sort({ createdAt: 1 });
    res.json({ data: pages });
  }),
);

pagesRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = `/${req.params.slug}`.replace(/\/+/g, "/");
    const page = await Page.findOne({ slug: { $in: [req.params.slug, slug] } });
    if (!page) return res.status(404).json({ message: "Page not found" });
    page.sections.sort((a, b) => a.sort_order - b.sort_order);
    res.json({ data: page });
  }),
);

pagesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = pageSchema.parse(req.body);
    const page = await Page.create({
      slug: body.slug,
      title: body.title,
      status: body.status || "published",
      seo_title: body.seo_title || "",
      seo_description: body.seo_description || "",
      sections: body.sections || [],
    });
    res.status(201).json({ id: page.id });
  }),
);

pagesRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = pageSchema.partial().parse(req.body);
    await Page.findByIdAndUpdate(req.params.id, removeUndefined(body), { runValidators: true });
    res.json({ message: "Page updated" });
  }),
);

pagesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Page.findByIdAndDelete(req.params.id);
    res.json({ message: "Page deleted" });
  }),
);

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
