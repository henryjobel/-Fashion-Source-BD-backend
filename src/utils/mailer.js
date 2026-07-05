import nodemailer from "nodemailer";

import { Setting } from "../models/index.js";

async function loadSettings(keys) {
  const rows = await Setting.find({ key: { $in: keys } });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function sendNotificationEmail({ subject, text }) {
  try {
    const settings = await loadSettings(["smtpHost", "smtpPort", "smtpUser", "smtpPass", "email"]);
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.email) return;

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort) || 587,
      secure: Number(settings.smtpPort) === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });

    await transporter.sendMail({
      from: settings.smtpUser,
      to: settings.email,
      subject,
      text,
    });
  } catch (error) {
    console.error("Notification email failed:", error.message);
  }
}
