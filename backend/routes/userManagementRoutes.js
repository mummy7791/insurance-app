const express = require("express");
const router = express.Router();

const User = require("../models/User");
const auth = require("../middleware/auth");
const createAuditLog = require("../utils/createAuditLog");

const allowedRoles = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
];

const allowedStatus = ["active", "blocked"];

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const { name, email, role, status } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email and role are required",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: "email-otp-login",
      role,
      status: status || "active",
    });

    await createAuditLog({
      req,
      action: "CREATE",
      module: "USER_MANAGEMENT",
      description: `Created user ${user.name} (${user.email}) with role ${user.role}`,
      targetUserId: user._id,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("User create error:", error);
    res.status(500).json({ message: "User create failed" });
  }
});

router.get("/", auth(["admin"]), async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -refreshToken")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Users fetch error:", error);
    res.status(500).json({ message: "Users fetch failed" });
  }
});

router.put("/:id/role", auth(["admin"]), async (req, res) => {
  try {
    const { role } = req.body;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditLog({
      req,
      action: "ROLE_UPDATE",
      module: "USER_MANAGEMENT",
      description: `Updated user ${user.email} role to ${user.role}`,
      targetUserId: user._id,
    });

    res.json(user);
  } catch (error) {
    console.error("Role update error:", error);
    res.status(500).json({ message: "Role update failed" });
  }
});

router.put("/:id/status", auth(["admin"]), async (req, res) => {
  try {
    const { status } = req.body;

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditLog({
      req,
      action: "STATUS_UPDATE",
      module: "USER_MANAGEMENT",
      description: `Updated user ${user.email} status to ${user.status}`,
      targetUserId: user._id,
    });

    res.json(user);
  } catch (error) {
    console.error("User status update error:", error);
    res.status(500).json({ message: "User status update failed" });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditLog({
      req,
      action: "DELETE",
      module: "USER_MANAGEMENT",
      description: `Deleted user ${user.name} (${user.email})`,
      targetUserId: user._id,
    });

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("User delete error:", error);
    res.status(500).json({ message: "User delete failed" });
  }
});

module.exports = router;