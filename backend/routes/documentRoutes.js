const express = require("express");
const multer = require("multer");
const path = require("path");

const Document = require("../models/Document");
const auth = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/", auth(), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File required" });
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
    const documents = await Document.find().sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error("Documents fetch error:", error);
    res.status(500).json({ message: "Documents fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(document);
  } catch (error) {
    console.error("Document update error:", error);
    res.status(500).json({ message: "Document update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Document delete error:", error);
    res.status(500).json({ message: "Document delete failed" });
  }
});

module.exports = router;