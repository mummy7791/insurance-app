const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const router = express.Router();

const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;
const DUMMY_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const authRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = authAttempts.get(key);

  if (!current || current.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return next();
  }

  if (current.count >= AUTH_MAX_ATTEMPTS) {
    res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
  }

  current.count += 1;
  return next();
};

const User = require("../models/User");
const sendOTP = require("../services/mailService");
const sendEmail = require("../utils/sendEmail");
const auth = require("../middleware/auth");

const createToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const generateOtp = () =>
  crypto.randomInt(100000, 1000000).toString();

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password);

const safeSendOTP = async (email, otp) => {
  try {
    await sendOTP(email, otp);
    return true;
  } catch (error) {
    console.error("OTP email sending failed:", error.message);
    return false;
  }
};

const getPermissionsByRole = (role) => {
  const permissions = {
    admin: ["all"],
    bm: ["dashboard", "customers", "leads", "policies", "premiums", "claims", "reports", "ai"],
    unit_manager: ["dashboard", "customers", "leads", "policies", "premiums", "followups"],
    agency_manager: ["dashboard", "customers", "leads", "policies", "followups"],
    advisor: ["dashboard", "customers", "leads", "policies", "followups"],
    agent: ["dashboard", "customers", "leads"],
    customer: ["customer_dashboard", "policies", "premiums", "claims"],
  };

  return permissions[role] || [];
};

router.get("/test", (req, res) => {
  res.json({ message: "Auth route working" });
});

router.post("/admin-login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    const user = normalizedEmail
      ? await User.findOne({
          email: normalizedEmail,
          role: "admin",
        })
      : null;

    const ok = await bcrypt.compare(
      typeof password === "string" ? password : "",
      user?.password || DUMMY_PASSWORD_HASH
    );

    if (!user || !ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    res.json({
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || getPermissionsByRole(user.role),
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Admin login failed" });
  }
});

router.post("/create-staff", auth(["admin"]), async (req, res) => {
  // Staff creation is handled by protected staff-management routes in production.
  try {
    const { name, email, password, role, branch, phone } = req.body;
    const allowedRoles = ["bm", "unit_manager", "agency_manager", "advisor", "agent"];

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role required" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid staff role" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include a letter and number" });
    }

    const otp = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedEmail =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: phone || "",
      password: hashedPassword,
      role,
      branch: branch || "",
      status: "active",
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      isEmailVerified: false,
      permissions: getPermissionsByRole(role),
    });

    const emailSent = await safeSendOTP(user.email, otp);
    if (!emailSent) {
      return res.status(503).json({ message: "Staff created, but verification email could not be sent. Please retry OTP delivery." });
    }

    res.json({
      message: "Staff created. OTP sent to email.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ message: "Staff create failed" });
  }
});

router.post("/register", authRateLimit, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password required" });
    }

    const normalizedEmail =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(201).json({
        message: "If this email is eligible for registration, verification instructions will be sent.",
      });
    }

    const otp = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: phone || "",
      password: hashedPassword,
      role: "customer",
      status: "active",
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      isEmailVerified: false,
      permissions: getPermissionsByRole("customer"),
    });

    const emailSent = await safeSendOTP(user.email, otp);

    if (!emailSent) {
      return res.status(503).json({
        message: "Customer registered, but verification email could not be sent. Please retry OTP delivery.",
        email: user.email,
      });
    }

    res.status(201).json({
      message: "Customer registered. OTP sent to email.",
      email: user.email,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      error.code === 11000
    ) {
      return res.status(201).json({
        message: "If this email is eligible for registration, verification instructions will be sent.",
      });
    }

    console.error("Customer register error:", error);
    res.status(500).json({ message: "Customer register failed" });
  }
});

router.post("/send-login-otp", authRateLimit, async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase().trim()
        : "";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email, role: "customer" });

    // Keep the public response generic so this endpoint does not reveal
    // whether a customer account exists.
    if (!user || (user.status && user.status !== "active")) {
      return res.json({
        message: "If an eligible customer account exists, an OTP will be sent.",
      });
    }

    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      return res.json({
        message: "If an eligible customer account exists, an OTP will be sent.",
      });
    }

    const otp = generateOtp();

    user.otp = otp;
    user.otpAttempts = 0;
    user.otpLockedUntil = null;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailSent = await safeSendOTP(user.email, otp);

    if (!emailSent) {
      return res.status(503).json({
        message: "OTP email could not be sent right now. Please try again shortly.",
      });
    }

    return res.json({
      message: "OTP sent to your registered email.",
    });
  } catch (error) {
    console.error("Send login OTP error:", error);
    return res.status(500).json({ message: "Send login OTP failed" });
  }
});

router.post("/login-with-otp", authRateLimit, async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase().trim()
        : "";
    const otp =
      typeof req.body?.otp === "string" || typeof req.body?.otp === "number"
        ? String(req.body.otp).trim()
        : "";

    if (!email || !otp) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    const user = await User.findOne({ email, role: "customer" });

    if (!user || (user.status && user.status !== "active")) {
      return res.status(401).json({ message: "Invalid email or OTP" });
    }

    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      return res.status(429).json({
        message: "Too many OTP attempts. Please try again later.",
      });
    }

    const otpIsValid =
      user.otp &&
      user.otp === otp &&
      user.otpExpires &&
      user.otpExpires >= new Date();

    if (!otpIsValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= 5) {
        user.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.otpAttempts = 0;
      }

      await user.save();
      return res.status(401).json({ message: "Invalid email or OTP" });
    }

    user.otp = "";
    user.otpExpires = null;
    user.otpAttempts = 0;
    user.otpLockedUntil = null;
    user.isEmailVerified = true;
    await user.save();

    return res.json({
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || getPermissionsByRole(user.role),
      },
    });
  } catch (error) {
    console.error("Customer OTP login error:", error);
    return res.status(500).json({ message: "OTP login failed" });
  }
});

router.post("/verify-otp", authRateLimit, async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase().trim()
        : "";
    const otp =
      typeof req.body?.otp === "string" || typeof req.body?.otp === "number"
        ? String(req.body.otp).trim()
        : "";

    if (!email || !otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });

    if (!user || (user.status && user.status !== "active")) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      return res.status(429).json({
        message: "Too many OTP attempts. Please try again later.",
      });
    }

    const otpIsValid =
      user.otp &&
      user.otp === otp &&
      user.otpExpires &&
      user.otpExpires >= new Date();

    if (!otpIsValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= 5) {
        user.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.otpAttempts = 0;
      }

      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = "";
    user.otpExpires = null;
    user.otpAttempts = 0;
    user.otpLockedUntil = null;
    user.isEmailVerified = true;
    await user.save();

    return res.json({
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch || "",
        permissions: user.permissions || getPermissionsByRole(user.role),
      },
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return res.status(500).json({ message: "OTP verify failed" });
  }
});

router.post("/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    const user = normalizedEmail
      ? await User.findOne({ email: normalizedEmail })
      : null;

    const ok = await bcrypt.compare(
      typeof password === "string" ? password : "",
      user?.password || DUMMY_PASSWORD_HASH
    );

    if (!user || !ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Please use Admin Login" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email with OTP before logging in" });
    }

    res.json({
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch || "",
        permissions: user.permissions || getPermissionsByRole(user.role),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;