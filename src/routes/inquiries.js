import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Inquiry } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendNotificationEmail } from "../utils/mailer.js";

export const inquiriesRouter = Router();

const inquirySchema = z.object({
  type: z.string().optional(),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
});

inquiriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = inquirySchema.parse(req.body);
    const inquiry = await Inquiry.create({
      type: body.type || "contact",
      name: body.name || "",
      email: body.email || "",
      phone: body.phone || "",
      subject: body.subject || "",
      message: body.message || "",
    });
    sendNotificationEmail({
      subject: `New ${inquiry.type} inquiry: ${inquiry.subject || inquiry.name || "Website"}`,
      text: `Name: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone}\nSubject: ${inquiry.subject}\n\n${inquiry.message}`,
    });
    res.status(201).json({ id: inquiry.id, message: "Inquiry submitted" });
  }),
);

inquiriesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await Inquiry.find().sort({ createdAt: -1 });
    res.json({ data: rows });
  }),
);

inquiriesRouter.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ status: z.enum(["open", "review", "closed", "archived"]) }).parse(req.body);
    await Inquiry.findByIdAndUpdate(req.params.id, { status: body.status }, { runValidators: true });
    res.json({ message: "Inquiry status updated" });
  }),
);
