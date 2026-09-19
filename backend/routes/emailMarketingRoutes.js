const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

const auth = require("../middleware/auth");
const EmailCampaign = require("../models/EmailCampaign");
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");

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

const normalizeCampaignContent = (subject, message) => {
  if (
    typeof subject !== "string" ||
    typeof message !== "string" ||
    !subject.trim() ||
    !message.trim()
  ) {
    return null;
  }

  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  if (cleanSubject.length > 200 || cleanMessage.length > 20000) {
    return null;
  }

  return {
    subject: cleanSubject,
    message: cleanMessage,
  };
};

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendMail = async ({ to, subject, message }) => {
  const transporter = createTransporter();
  const safeMessageHtml = escapeHtml(message).replace(/\r?\n/g, "<br />");

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text: message,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#be0038;">LifeSecure CRM</h2>
        <div style="line-height:1.6;color:#111;">
          ${safeMessageHtml}
        </div>
        <hr />
        <small style="color:#777;">LifeSecure CRM</small>
      </div>
    `,
  });
};

router.post("/send", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const { to, subject, message, type } = req.body;

    const content = normalizeCampaignContent(subject, message);

    if (!isValidEmail(to) || !content) {
      return res.status(400).json({
        message: "Valid recipient, subject and message are required",
      });
    }

    const safeTo = to.trim();

    try {
      await sendMail({
        to: safeTo,
        subject: content.subject,
        message: content.message,
      });

      const record = await EmailCampaign.create({
        to: safeTo,
        subject: content.subject,
        message: content.message,
        type: type || "Single",
        status: "Sent",
        sentBy: req.user?.id,
      });

      res.status(201).json(record);
    } catch (mailError) {
      const record = await EmailCampaign.create({
        to: safeTo,
        subject: content.subject,
        message: content.message,
        type: type || "Single",
        status: "Failed",
        error: mailError.message,
        sentBy: req.user?.id,
      });

      res.status(500).json({
        message: "Email failed",
        record,
      });
    }
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ message: "Email send failed" });
  }
});

router.post("/bulk-customers", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    const { subject, message } = req.body;

    const content = normalizeCampaignContent(subject, message);

    if (!content) {
      return res.status(400).json({
        message: "Valid subject and message are required",
      });
    }

    const customers = await Customer.find({ email: { $exists: true, $ne: "" } });

    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        await sendMail({
          to: customer.email,
          subject: content.subject,
          message: content.message,
        });

        await EmailCampaign.create({
          to: customer.email,
          subject: content.subject,
          message: content.message,
          type: "Bulk",
          status: "Sent",
          sentBy: req.user?.id,
        });

        sent += 1;
      } catch (error) {
        await EmailCampaign.create({
          to: customer.email,
          subject: content.subject,
          message: content.message,
          type: "Bulk",
          status: "Failed",
          error: error.message,
          sentBy: req.user?.id,
        });

        failed += 1;
      }
    }

    res.json({
      message: "Bulk customer email completed",
      total: customers.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Bulk customer email error:", error);
    res.status(500).json({ message: "Bulk customer email failed" });
  }
});

router.post("/bulk-leads", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    const { subject, message } = req.body;

    const content = normalizeCampaignContent(subject, message);

    if (!content) {
      return res.status(400).json({
        message: "Valid subject and message are required",
      });
    }

    const leads = await Lead.find({ email: { $exists: true, $ne: "" } });

    let sent = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        await sendMail({
          to: lead.email,
          subject: content.subject,
          message: content.message,
        });

        await EmailCampaign.create({
          to: lead.email,
          subject: content.subject,
          message: content.message,
          type: "Lead",
          status: "Sent",
          sentBy: req.user?.id,
        });

        sent += 1;
      } catch (error) {
        await EmailCampaign.create({
          to: lead.email,
          subject: content.subject,
          message: content.message,
          type: "Lead",
          status: "Failed",
          error: error.message,
          sentBy: req.user?.id,
        });

        failed += 1;
      }
    }

    res.json({
      message: "Bulk lead email completed",
      total: leads.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Bulk lead email error:", error);
    res.status(500).json({ message: "Bulk lead email failed" });
  }
});

router.get("/history", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const history = await EmailCampaign.find()
      .sort({ createdAt: -1 })
      .limit(300);

    res.json(history);
  } catch (error) {
    console.error("Email history error:", error);
    res.status(500).json({ message: "Email history failed" });
  }
});

router.delete("/history/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    const record = await EmailCampaign.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Email record not found" });
    }

    res.json({ message: "Email history deleted" });
  } catch (error) {
    console.error("Email history delete error:", error);
    res.status(500).json({ message: "Email history delete failed" });
  }
});

module.exports = router;