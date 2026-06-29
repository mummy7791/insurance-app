const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

const auth = require("../middleware/auth");
const EmailCampaign = require("../models/EmailCampaign");
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");

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

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#be0038;">LifeSecure CRM</h2>
        <div style="line-height:1.6;color:#111;">
          ${message}
        </div>
        <hr />
        <small style="color:#777;">LifeSecure CRM</small>
      </div>
    `,
  });
};

router.post("/send", auth(), async (req, res) => {
  try {
    const { to, subject, message, type } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        message: "To, subject and message are required",
      });
    }

    try {
      await sendMail({ to, subject, message });

      const record = await EmailCampaign.create({
        to,
        subject,
        message,
        type: type || "Single",
        status: "Sent",
        sentBy: req.user?.id,
      });

      res.status(201).json(record);
    } catch (mailError) {
      const record = await EmailCampaign.create({
        to,
        subject,
        message,
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

    if (!subject || !message) {
      return res.status(400).json({
        message: "Subject and message are required",
      });
    }

    const customers = await Customer.find({ email: { $exists: true, $ne: "" } });

    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        await sendMail({
          to: customer.email,
          subject,
          message,
        });

        await EmailCampaign.create({
          to: customer.email,
          subject,
          message,
          type: "Bulk",
          status: "Sent",
          sentBy: req.user?.id,
        });

        sent += 1;
      } catch (error) {
        await EmailCampaign.create({
          to: customer.email,
          subject,
          message,
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

    if (!subject || !message) {
      return res.status(400).json({
        message: "Subject and message are required",
      });
    }

    const leads = await Lead.find({ email: { $exists: true, $ne: "" } });

    let sent = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        await sendMail({
          to: lead.email,
          subject,
          message,
        });

        await EmailCampaign.create({
          to: lead.email,
          subject,
          message,
          type: "Lead",
          status: "Sent",
          sentBy: req.user?.id,
        });

        sent += 1;
      } catch (error) {
        await EmailCampaign.create({
          to: lead.email,
          subject,
          message,
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

router.get("/history", auth(), async (req, res) => {
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