const express = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const Otp = require("../models/Otp");
const User = require("../models/User");
const createAuditLog = require("../utils/createAuditLog");

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

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post("/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = generateOtp();

    await Otp.deleteMany({ email: cleanEmail });

    await Otp.create({
      email: cleanEmail,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: cleanEmail,
      subject: "LifeSecure OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color:#be0038;">LifeSecure CRM</h2>
          <p>Hello,</p>
          <p>Your OTP verification code is:</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color:#111;">
            ${otp}
          </div>
          <p>This OTP is valid for <b>5 minutes</b>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr />
          <small style="color:#777;">LifeSecure CRM Security Team</small>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ message: "OTP send failed" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = await User.create({
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        password: "otp-login",
        role: "agent",
        status: "active",
      });
    }

    if (user.status === "blocked") {
      await Otp.deleteMany({ email: cleanEmail });

      return res.status(403).json({
        message: "Your account is blocked. Please contact admin.",
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await createAuditLog({
      req: {
        ...req,
        user: {
          id: user._id,
          role: user.role,
        },
      },
      action: "LOGIN",
      module: "AUTH",
      description: `${user.name} logged in using Email OTP`,
      targetUserId: user._id,
    });

    await Otp.deleteMany({ email: cleanEmail });

    res.json({
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || "active",
      },
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(500).json({ message: "OTP verify failed" });
  }
});

module.exports = router;