import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { Supplier } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendNotificationEmail } from "../utils/mailer.js";

export const suppliersRouter = Router();

const supplierSchema = z.object({
  company_name: z.string().min(1),
  contact_person: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  monthly_capacity: z.string().optional().nullable(),
  service_details: z.string().optional().nullable(),
  profile_url: z.string().optional().nullable(),
});

suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = supplierSchema.parse(req.body);
    const supplier = await Supplier.create({
      company_name: body.company_name,
      contact_person: body.contact_person || "",
      email: body.email || "",
      website: body.website || "",
      country: body.country || "",
      monthly_capacity: body.monthly_capacity || "",
      service_details: body.service_details || "",
      profile_url: body.profile_url || "",
    });
    sendNotificationEmail({
      subject: `New supplier application: ${supplier.company_name}`,
      text: `Company: ${supplier.company_name}\nContact: ${supplier.contact_person}\nEmail: ${supplier.email}\nCountry: ${supplier.country}\nMonthly Capacity: ${supplier.monthly_capacity}\n\n${supplier.service_details}`,
    });
    res.status(201).json({ id: supplier.id, message: "Supplier application submitted" });
  }),
);

suppliersRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await Supplier.find().sort({ createdAt: -1 });
    res.json({ data: rows });
  }),
);

suppliersRouter.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ status: z.enum(["new", "review", "approved", "rejected"]) })
      .parse(req.body);
    await Supplier.findByIdAndUpdate(req.params.id, { status: body.status }, { runValidators: true });
    res.json({ message: "Supplier status updated" });
  }),
);
