const express = require("express");
const nodemailer = require("nodemailer");
const auth = require("../middleware/auth");

const router = express.Router();

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

router.post("/send", auth(), async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        message: "To, subject and message are required",
      });
    }

    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>LifeSecure CRM</h2>
          <p>${message.replace(/\n/g, "<br />")}</p>
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