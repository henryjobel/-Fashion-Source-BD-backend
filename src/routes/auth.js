import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";

import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { Admin } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const admin = await Admin.findOne({ email: body.email.toLowerCase() });

    if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ admin: req.admin });
  }),
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

authRouter.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = passwordSchema.parse(req.body);
    const admin = await Admin.findById(req.admin.id);
    if (!admin || !(await bcrypt.compare(body.currentPassword, admin.passwordHash))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    admin.passwordHash = await bcrypt.hash(body.newPassword, 10);
    await admin.save();
    res.json({ message: "Password updated" });
  }),
);
