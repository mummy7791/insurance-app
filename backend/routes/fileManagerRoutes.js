const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../middleware/auth");
const FileManager = require("../models/FileManager");

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
];

const uploadDir = path.join(__dirname, "..", "uploads", "files");

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
      console.error("File cleanup error:", error);
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
      return bytes.length >= 5 && bytes.subarray(0, 5).toString() === "%PDF-";
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
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      return (
        bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(pngSignature)
      );
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
  res.json({ message: "File Manager Route Working" });
});

router.post(
  "/upload",
  auth(STAFF_ROLES),
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "File too large. Maximum size is 10 MB",
          });
        }

        return res.status(400).json({ message: "Invalid file upload" });
      }

      return res.status(400).json({
        message: error.message || "Invalid file upload",
      });
    });
  },
  async (req, res) => {
    try {
      const { title, category, linkedId } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
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

      const record = await FileManager.create({
        title: String(title || req.file.originalname).trim(),
        category: category || "Other",
        fileName: req.file.filename,
        originalName: path.basename(req.file.originalname),
        filePath: `/uploads/files/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        linkedId: String(linkedId || "").trim(),
        uploadedBy: req.user.id,
      });

      return res.status(201).json(record);
    } catch (error) {
      if (req.file?.path) {
        await removeFile(req.file.path);
      }

      console.error("File upload error:", error);
      return res.status(500).json({ message: "File upload failed" });
    }
  }
);

router.get("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const { category, search } = req.query;

    const query = {};

    if (category && category !== "All") {
      query.category = category;
    }

    if (typeof search === "string" && search.trim()) {
      const normalizedSearch = search.trim().slice(0, 100);
      const escapedSearch = normalizedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      query.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { originalName: { $regex: escapedSearch, $options: "i" } },
        { category: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const files = await FileManager.find(query)
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(files);
  } catch (error) {
    console.error("Files fetch error:", error);
    res.status(500).json({ message: "Files fetch failed" });
  }
});

router.get("/:id/download", auth(STAFF_ROLES), async (req, res) => {
  try {
    const record = await FileManager.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "File not found" });
    }

    const fullPath = path.join(uploadDir, path.basename(record.fileName));

    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ message: "Stored file not found" });
    }

    res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(record.originalName || record.fileName)
        .replace(/[\r\n"\\]/g, "_")}"`
    );

    return res.sendFile(fullPath);
  } catch (error) {
    console.error("File download error:", error);
    return res.status(500).json({ message: "File download failed" });
  }
});

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    const record = await FileManager.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "File not found" });
    }

    const fullPath = path.join(uploadDir, path.basename(record.fileName));

    await removeFile(fullPath);
    await record.deleteOne();

    res.json({ message: "File deleted" });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({ message: "File delete failed" });
  }
});

module.exports = router;
