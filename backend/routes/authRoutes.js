const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const User = require("../models/User");
const sendOTP = require("../services/mailService");
const sendEmail = require("../utils/sendEmail");

const createToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

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

router.post("/create-admin", async (req, res) => {
  try {
    const email = "admin@gmail.com";
    const password = "mummy@7791";
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        name: "Super Admin",
        email,
        password: hashedPassword,
        role: "admin",
        status: "active",
        isEmailVerified: true,
        permissions: getPermissionsByRole("admin"),
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Admin ready successfully",
      email,
      password,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ message: "Create admin failed" });
  }
});

router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: "admin",
    });

    if (!user) return res.status(401).json({ message: "Admin not found" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ message: "Invalid password" });

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

router.post("/create-staff", async (req, res) => {
  try {
    const { name, email, password, role, branch, phone } = req.body;
    const allowedRoles = ["bm", "unit_manager", "agency_manager", "advisor", "agent"];

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role required" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid staff role" });
    }

    const otp = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        name,
        email: email.toLowerCase().trim(),
        phone: phone || "",
        password: hashedPassword,
        role,
        branch: branch || "",
        status: "active",
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        isEmailVerified: false,
        permissions: getPermissionsByRole(role),
      },
      { upsert: true, new: true }
    );

    await sendOTP(user.email, otp);

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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const otp = generateOtp();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone: phone || "",
      password: hashedPassword,
      role: "customer",
      status: "active",
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      isEmailVerified: false,
      permissions: getPermissionsByRole("customer"),
    });

    await sendOTP(user.email, otp);

    res.status(201).json({
      message: "Customer registered. OTP sent to email.",
      email: user.email,
    });
  } catch (error) {
    console.error("Customer register error:", error);
    res.status(500).json({ message: "Customer register failed" });
  }
});

router.post("/send-login-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();

    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTP(user.email, otp);

    res.json({
      message: "OTP sent to email.",
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Send login OTP error:", error);
    res.status(500).json({ message: "Send login OTP failed" });
  }
});
router.get("/test-email", async (req, res) => {
  try {
    await sendEmail(
      process.env.EMAIL_USER,
      "LifeSecure CRM Test Email",
      "<h2>Email Working Successfully ✅</h2>"
    );

    res.json({ message: "Email Sent Successfully" });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ message: "Email Failed" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.otp = "";
    user.otpExpires = null;
    user.isEmailVerified = true;
    await user.save();

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
    console.error("OTP verify error:", error);
    res.status(500).json({ message: "OTP verify failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({ message: "Please use Admin Login" });
    }

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ message: "Invalid password" });

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