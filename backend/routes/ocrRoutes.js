const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../middleware/auth");
const OCRDocument = require("../models/OCRDocument");

const uploadDir = path.join(__dirname, "..", "uploads", "ocr");

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
  res.json({ message: "OCR Route Working" });
});

router.get("/history", auth(), async (req, res) => {
  try {
    const docs = await OCRDocument.find({}).sort({ createdAt: -1 }).lean();
    res.json(Array.isArray(docs) ? docs : []);
  } catch (error) {
    console.error("OCR history error:", error);
    res.json([]);
  }
});

router.post("/upload", auth(), upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Document file required" });
    }

    const record = await OCRDocument.create({
      documentType: req.body.documentType || "Other",
      fileName: req.file.filename,
      filePath: `/uploads/ocr/${req.file.filename}`,
      extractedText: "OCR engine not connected yet. File uploaded successfully.",
      extractedData: {
        name: "",
        dob: "",
        documentNumber: "",
        address: "",
      },
      status: "Pending",
      uploadedBy: req.user?.id || null,
    });

    res.status(201).json(record);
  } catch (error) {
    console.error("OCR upload error:", error);
    res.status(500).json({ message: "OCR upload failed" });
  }
});

router.put("/:id/verify", auth(["admin", "bm"]), async (req, res) => {
  try {
    const doc = await OCRDocument.findByIdAndUpdate(
      req.params.id,
      { status: "Verified" },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.json(doc);
  } catch (error) {
    console.error("OCR verify error:", error);
    res.status(500).json({ message: "OCR verify failed" });
  }
});

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    await OCRDocument.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("OCR delete error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;