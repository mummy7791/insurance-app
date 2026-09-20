const express = require("express");
const nodemailer = require("nodemailer");
const auth = require("../middleware/auth");

const router = express.Router();

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isValidEmail = (value) =>
  typeof value === "string" &&
  /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value.trim()) &&
  value.trim().length <= 254;

const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    family: 4,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
};


router.get("/smtp-check", auth(["admin"]), async (req, res) => {
  try {
    const required = [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_USER",
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
      return res.status(500).json({
        ok: false,
        code: "MISSING_GMAIL_CONFIG",
        message: `Missing Gmail configuration: ${missing.join(", ")}`,
      });
    }

    const { google } = require("googleapis");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const profile = await gmail.users.getProfile({
      userId: "me",
    });

    return res.json({
      ok: true,
      message: "Gmail API authentication successful",
      email: profile.data.emailAddress,
    });
  } catch (error) {
    console.error(
      "Gmail API diagnostic failed:",
      error?.response?.data?.error || error.message
    );

    return res.status(500).json({
      ok: false,
      code: "GMAIL_API_ERROR",
      message: "Gmail API authentication failed",
    });
  }
});

router.post("/send", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (
      typeof to !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string" ||
      !to.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        message: "To, subject and message are required",
      });
    }

    const safeTo = to.trim();
    const safeSubject = subject.trim();
    const plainMessage = message.trim();

    if (!isValidEmail(safeTo)) {
      return res.status(400).json({ message: "Invalid recipient email" });
    }

    if (safeSubject.length > 200) {
      return res.status(400).json({ message: "Subject is too long" });
    }

    if (plainMessage.length > 20000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    const safeMessageHtml = escapeHtml(plainMessage).replace(/\r?\n/g, "<br />");

    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: safeTo,
      subject: safeSubject,
      text: plainMessage,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>LifeSecure CRM</h2>
          <p>${safeMessageHtml}</p>
          <hr />
          <p style="font-size: 12px; color: #666;">
            This email was sent from LifeSecure CRM.
          </p>
        </div>
      `,
    });

    res.json({
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({
      message: "Email send failed",
    });
  }
});

module.exports = router;