const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const router = express.Router();

const auth = require("../middleware/auth");
const Customer = require("../models/Customer");
const User = require("../models/User");

const uploadDir = path.join(__dirname, "..", "uploads", "profiles");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PROFILE_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = PROFILE_IMAGE_TYPES[file.mimetype] || "";
    cb(null, `${crypto.randomBytes(24).toString("hex")}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!PROFILE_IMAGE_TYPES[file.mimetype]) {
      const error = new Error("Only JPEG, PNG and WEBP images are allowed");
      error.code = "INVALID_PROFILE_IMAGE_TYPE";
      return cb(error);
    }

    cb(null, true);
  },
});

const removeFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Profile photo cleanup error:", error);
    }
  }
};

const hasValidImageSignature = async (filePath, mimetype) => {
  const handle = await fs.promises.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);

    if (mimetype === "image/jpeg") {
      return (
        bytesRead >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimetype === "image/png") {
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      return bytesRead >= 8 && buffer.subarray(0, 8).equals(pngSignature);
    }

    if (mimetype === "image/webp") {
      return (
        bytesRead >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    }

    return false;
  } finally {
    await handle.close();
  }
};

const getUserEmail = async (req) => {
  if (req.user?.email) return req.user.email;

  if (!req.user?.id) return "";

  const user = await User.findById(req.user.id).select("email");
  return user?.email || "";
};

const findCustomer = async (req) => {
  const userEmail = await getUserEmail(req);
  const normalizedEmail = String(userEmail || "").trim().toLowerCase();

  const customer = normalizedEmail
    ? await Customer.findOne({ email: normalizedEmail })
    : null;

  return { customer, userEmail: normalizedEmail };
};

const toCustomerSafeResponse = (customer) => {
  if (!customer) return null;

  const data =
    typeof customer.toObject === "function"
      ? customer.toObject()
      : customer;

  return {
    _id: data._id,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    photo: data.photo || "",
    dob: data.dob || "",
    gender: data.gender || "",
    address: data.address || "",
    nominee: data.nominee || "",
    nomineeRelation: data.nomineeRelation || "",
    planName: data.planName || "",
    policyNo: data.policyNo || "",
    policyType: data.policyType || "",
    status: data.status || "",
    kycStatus: data.kycStatus || "Pending",
    premium: data.premium || "",
    coverage: data.coverage || "",
    startDate: data.startDate || "",
    expiryDate: data.expiryDate || "",
    renewalDate: data.renewalDate || "",
    members: Array.isArray(data.members) ? data.members : [],
    lastPayment: data.lastPayment || "",
    nextPremium: data.nextPremium || "",
    paymentMode: data.paymentMode || "",
  };
};

router.get("/test", (req, res) => {
  res.json({ message: "Customer Profile Route Working" });
});

router.get("/", auth(["customer"]), async (req, res) => {
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

    res.json(toCustomerSafeResponse(customer));
  } catch (error) {
    console.error("Customer profile fetch error:", error);
    res.status(500).json({ message: "Customer profile fetch failed" });
  }
});

router.put("/", auth(["customer"]), async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const found = await findCustomer(req);
    let customer = found.customer;
    const accountEmail = String(found.userEmail || "").trim().toLowerCase();

    if (!accountEmail) {
      return res.status(400).json({ message: "Account email is required" });
    }

    if (!customer) {
      customer = await Customer.create({
        name: name || "",
        email: accountEmail,
        phone: phone || "",
        address: address || "",
        kycStatus: "Pending",
      });
    } else {
      customer.name = name || customer.name || "";
      customer.email = accountEmail;
      customer.phone = phone || customer.phone || "";
      customer.address = address || customer.address || "";
      await customer.save();
    }

    res.json(toCustomerSafeResponse(customer));
  } catch (error) {
    console.error("Customer profile update error:", error);
    res.status(500).json({ message: "Customer profile update failed" });
  }
});

const profilePhotoUpload = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Profile photo must be 5 MB or smaller",
      });
    }

    if (error.code === "INVALID_PROFILE_IMAGE_TYPE") {
      return res.status(400).json({
        message: "Only JPEG, PNG and WEBP images are allowed",
      });
    }

    console.error("Profile photo upload middleware error:", error);
    return res.status(400).json({ message: "Invalid profile photo upload" });
  });
};

router.post(
  "/photo",
  auth(["customer"]),
  profilePhotoUpload,
  async (req, res) => {
    const uploadedPath = req.file?.path || "";

    try {
      if (!req.file) {
        return res.status(400).json({ message: "Photo is required" });
      }

      const validSignature = await hasValidImageSignature(
        req.file.path,
        req.file.mimetype
      );

      if (!validSignature) {
        await removeFile(req.file.path);
        return res.status(400).json({ message: "Invalid image file" });
      }

      const found = await findCustomer(req);

      if (!found.userEmail) {
        await removeFile(req.file.path);
        return res.status(400).json({ message: "Account email is required" });
      }

      let customer = found.customer;

      if (!customer) {
        customer = await Customer.create({
          name: "",
          email: found.userEmail,
          phone: "",
          address: "",
          kycStatus: "Pending",
        });
      }

      const previousPhoto = customer.photo || "";

      customer.photo = `/uploads/profiles/${req.file.filename}`;
      await customer.save();

      if (previousPhoto.startsWith("/uploads/profiles/")) {
        const previousFileName = path.basename(previousPhoto);
        const previousPath = path.join(uploadDir, previousFileName);

        if (previousPath !== req.file.path) {
          await removeFile(previousPath);
        }
      }

      res.json(toCustomerSafeResponse(customer));
    } catch (error) {
      await removeFile(uploadedPath);
      console.error("Profile photo upload error:", error);
      res.status(500).json({ message: "Profile photo upload failed" });
    }
  }
);

router.put("/password", auth(["customer"]), async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const strongPassword =
      typeof newPassword === "string" &&
      newPassword.length >= 8 &&
      /[A-Za-z]/.test(newPassword) &&
      /\d/.test(newPassword);

    if (!strongPassword) {
      return res.status(400).json({
        message: "New password must be at least 8 characters and include a letter and number",
      });
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