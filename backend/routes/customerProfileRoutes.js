const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const router = express.Router();

const auth = require("../middleware/auth");
const Customer = require("../models/Customer");
const User = require("../models/User");

const uploadDir = path.join(__dirname, "..", "uploads", "profiles");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

const getUserEmail = async (req) => {
  if (req.user?.email) return req.user.email;

  if (!req.user?.id) return "";

  const user = await User.findById(req.user.id).select("email");
  return user?.email || "";
};

const findCustomer = async (req) => {
  const userId = req.user?.id;
  const userEmail = await getUserEmail(req);

  let customer = null;

  if (userEmail) {
    customer = await Customer.findOne({
      email: userEmail.toLowerCase().trim(),
    });
  }

  if (!customer && userId) {
    customer = await Customer.findOne({
      $or: [
        { userId },
        { userId: String(userId) },
        { user: userId },
        { user: String(userId) },
        { createdBy: userId },
        { createdBy: String(userId) },
      ],
    });
  }

  return { customer, userEmail };
};

router.get("/test", (req, res) => {
  res.json({ message: "Customer Profile Route Working" });
});

router.get("/", auth(), async (req, res) => {
  try {
    const { customer, userEmail } = await findCustomer(req);

    if (!customer) {
      return res.json({
        _id: "",
        name: "",
        email: userEmail || "",
        phone: "",
        address: "",
        kycStatus: "Pending",
        photo: "",
        message: "No customer profile linked",
      });
    }

    res.json(customer);
  } catch (error) {
    console.error("Customer profile fetch error:", error);
    res.status(500).json({ message: "Customer profile fetch failed" });
  }
});

router.put("/", auth(), async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const found = await findCustomer(req);
    let customer = found.customer;

    if (!customer) {
      customer = await Customer.create({
        name: name || "",
        email: email || found.userEmail || "",
        phone: phone || "",
        address: address || "",
        createdBy: req.user?.id || null,
        kycStatus: "Pending",
      });
    } else {
      customer.name = name || customer.name || "";
      customer.email = email || customer.email || found.userEmail || "";
      customer.phone = phone || customer.phone || "";
      customer.address = address || customer.address || "";
      await customer.save();
    }

    res.json(customer);
  } catch (error) {
    console.error("Customer profile update error:", error);
    res.status(500).json({ message: "Customer profile update failed" });
  }
});

router.post("/photo", auth(), upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Photo is required" });
    }

    const found = await findCustomer(req);
    let customer = found.customer;

    if (!customer) {
      customer = await Customer.create({
        name: "",
        email: found.userEmail || "",
        phone: "",
        address: "",
        createdBy: req.user?.id || null,
        kycStatus: "Pending",
      });
    }

    customer.photo = `/uploads/profiles/${req.file.filename}`;
    await customer.save();

    res.json(customer);
  } catch (error) {
    console.error("Profile photo upload error:", error);
    res.status(500).json({ message: "Profile photo upload failed" });
  }
});

router.put("/password", auth(), async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(req.user?.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      user.password &&
      user.password !== "email-otp-login" &&
      user.password !== "otp-login"
    ) {
      const match = await bcrypt.compare(oldPassword || "", user.password);

      if (!match) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: "Password update failed" });
  }
});

module.exports = router;