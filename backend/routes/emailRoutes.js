const express = require("express");
const { sendEmail } = require("../services/gmailService");
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
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
  value.trim().length <= 254;

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

    if (/\r|\n/.test(safeSubject)) {
      return res.status(400).json({ message: "Invalid subject" });
    }

    if (safeSubject.length > 200) {
      return res.status(400).json({ message: "Subject is too long" });
    }

    if (plainMessage.length > 20000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    const safeMessageHtml = escapeHtml(plainMessage).replace(/\r?\n/g, "<br />");

    await sendEmail({
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