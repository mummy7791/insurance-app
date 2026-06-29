const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../middleware/auth");
const FileManager = require("../models/FileManager");

const uploadDir = path.join(__dirname, "..", "uploads", "files");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

router.get("/test", (req, res) => {
  res.json({ message: "File Manager Route Working" });
});

router.post("/upload", auth(), upload.single("file"), async (req, res) => {
  try {
    const { title, category, linkedId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const record = await FileManager.create({
      title: title || req.file.originalname,
      category: category || "Other",
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/files/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      linkedId: linkedId || "",
      uploadedBy: req.user?.id || null,
    });

    res.status(201).json(record);
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "File upload failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const { category, search } = req.query;

    const query = {};

    if (category && category !== "All") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { originalName: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
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

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    const record = await FileManager.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "File not found" });
    }

    const fullPath = path.join(__dirname, "..", record.filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ message: "File deleted" });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({ message: "File delete failed" });
  }
});

module.exports = router;