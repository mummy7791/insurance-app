const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../middleware/auth");
const OCRDocument = require("../models/OCRDocument");

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "advisor",
  "agent",
];

const uploadDir = path.join(__dirname, "..", "uploads", "ocr");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MIME_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = MIME_EXTENSIONS[file.mimetype] || "";
    const randomName = crypto.randomBytes(24).toString("hex");
    cb(null, `${randomName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PDF, JPEG, PNG and WEBP files are allowed"));
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
      console.error("OCR file cleanup error:", error);
    }
  }
};

const hasValidSignature = async (filePath, mimeType) => {
  const handle = await fs.promises.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);

    if (mimeType === "application/pdf") {
      return bytes.length >= 5 &&
        bytes.subarray(0, 5).toString() === "%PDF-";
    }

    if (mimeType === "image/jpeg") {
      return (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );
    }

    if (mimeType === "image/png") {
      const signature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      return bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(signature);
    }

    if (mimeType === "image/webp") {
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString() === "RIFF" &&
        bytes.subarray(8, 12).toString() === "WEBP"
      );
    }

    return false;
  } finally {
    await handle.close();
  }
};

router.get("/test", (req, res) => {
  res.json({ message: "OCR Route Working" });
});

router.get("/history", auth(STAFF_ROLES), async (req, res) => {
  try {
    const docs = await OCRDocument.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json(Array.isArray(docs) ? docs : []);
  } catch (error) {
    console.error("OCR history error:", error);
    res.status(500).json({ message: "OCR history failed" });
  }
});

router.post(
  "/upload",
  auth(STAFF_ROLES),
  (req, res, next) => {
    upload.single("document")(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "File too large. Maximum size is 10 MB",
          });
        }

        return res.status(400).json({
          message: "Invalid document upload",
        });
      }

      return res.status(400).json({
        message: error.message || "Invalid document upload",
      });
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Document file required",
        });
      }

      const validSignature = await hasValidSignature(
        req.file.path,
        req.file.mimetype
      );

      if (!validSignature) {
        await removeFile(req.file.path);

        return res.status(400).json({
          message: "File content does not match the declared file type",
        });
      }

      const allowedDocumentTypes = new Set([
        "Aadhaar",
        "PAN",
        "Driving License",
        "Passport",
        "Other",
      ]);

      const documentType = allowedDocumentTypes.has(req.body.documentType)
        ? req.body.documentType
        : "Other";

      const record = await OCRDocument.create({
        documentType,
        fileName: req.file.filename,
        filePath: `/uploads/ocr/${req.file.filename}`,
        extractedText:
          "OCR engine not connected yet. File uploaded successfully.",
        extractedData: {
          name: "",
          dob: "",
          documentNumber: "",
          address: "",
        },
        status: "Pending",
        uploadedBy: req.user.id,
      });

      return res.status(201).json(record);
    } catch (error) {
      if (req.file?.path) {
        await removeFile(req.file.path);
      }

      console.error("OCR upload error:", error);
      return res.status(500).json({ message: "OCR upload failed" });
    }
  }
);

router.get("/:id/download", auth(STAFF_ROLES), async (req, res) => {
  try {
    const doc = await OCRDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const fullPath = path.join(uploadDir, path.basename(doc.fileName || ""));

    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ message: "Stored document not found" });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(doc.fileName || "document")}"`
    );

    return res.sendFile(fullPath);
  } catch (error) {
    console.error("OCR download error:", error);
    return res.status(500).json({ message: "Document download failed" });
  }
});

router.put("/:id/verify", auth(["admin", "bm"]), async (req, res) => {
  try {
    const doc = await OCRDocument.findByIdAndUpdate(
      req.params.id,
      { status: "Verified" },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(doc);
  } catch (error) {
    console.error("OCR verify error:", error);
    res.status(500).json({ message: "OCR verify failed" });
  }
});

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    const doc = await OCRDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const fullPath = path.join(uploadDir, path.basename(doc.fileName || ""));

    await removeFile(fullPath);
    await doc.deleteOne();

    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("OCR delete error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
