const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Document = require("../models/Document");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const extensionByMime = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const extension = extensionByMime[file.mimetype] || "";
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + extension;

    cb(null, uniqueName);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, PNG and WEBP files are allowed"));
    }
    cb(null, true);
  },
});

const detectFileType = async (filePath) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);

    if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
      return "application/pdf";
    }
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return "image/png";
    }
    if (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }
    return null;
  } finally {
    await handle.close();
  }
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

router.post("/", auth(), (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size must be 5 MB or less" });
    }
    return res.status(400).json({ message: error.message || "Invalid file upload" });
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File required" });
    }

    const detectedMimeType = await detectFileType(req.file.path);
    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ message: "File content does not match the allowed document type" });
    }

    const policy = await Policy.findOne({ policyNumber: req.body.policyNumber });
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    if (req.user.role === "customer" && String(policy.customerId || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Policy does not belong to this customer" });
    }

    if (!policy.customerId) {
      return res.status(400).json({ message: "Policy is not linked to a customer account" });
    }

    const document = await Document.create({
      customerName: req.body.customerName,
      policyNumber: req.body.policyNumber,
      documentType: req.body.documentType,
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      uploadedDate: new Date().toISOString().split("T")[0],
      status: "Pending",
      remarks: req.body.remarks || "No remarks",
      customerId: policy.customerId,
      createdBy: req.user.id,
    });

    res.status(201).json(document);
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ message: "Document upload failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "customer") {
      const policies = await Policy.find({ customerId: req.user.id }).select("policyNumber");
      query = {
        $or: [
          { customerId: req.user.id },
          { createdBy: req.user.id },
          { policyNumber: { $in: policies.map((policy) => policy.policyNumber) } },
        ],
      };
    }
    const documents = await Document.find(query).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error("Documents fetch error:", error);
    res.status(500).json({ message: "Documents fetch failed" });
  }
});

router.get("/:id/file", auth(), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    if (req.user.role === "customer") {
      const ownsPolicy = await Policy.exists({
        policyNumber: document.policyNumber,
        customerId: req.user.id,
      });
      const ownsDocument =
        String(document.customerId || "") === String(req.user.id) ||
        String(document.createdBy || "") === String(req.user.id);

      if (!ownsDocument && !ownsPolicy) {
        return res.status(403).json({ message: "Document access denied" });
      }
    }

    const fileName = path.basename(document.filePath);
    const absolutePath = path.join(__dirname, "..", "uploads", fileName);
    const downloadName = path.basename(String(document.fileName || "document")).replace(/["\r\n]/g, "");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error("Document file access error:", error);
    return res.status(500).json({ message: "Document file access failed" });
  }
});

router.put("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    const protectedFields = ["_id", "createdBy", "customerId", "policyNumber"];
    for (const field of protectedFields) delete req.body[field];

    Object.assign(document, req.body);
    await document.save();

    res.json(document);
  } catch (error) {
    console.error("Document update error:", error);
    res.status(500).json({ message: "Document update failed" });
  }
});

router.delete("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    const fileName = path.basename(document.filePath || "");
    const absolutePath = fileName
      ? path.join(__dirname, "..", "uploads", fileName)
      : null;

    await document.deleteOne();

    if (absolutePath) {
      try {
        await fs.promises.unlink(absolutePath);
      } catch (fileError) {
        if (fileError.code !== "ENOENT") {
          console.error("Document file cleanup error:", fileError);
        }
      }
    }

    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Document delete error:", error);
    res.status(500).json({ message: "Document delete failed" });
  }
});

module.exports = router;