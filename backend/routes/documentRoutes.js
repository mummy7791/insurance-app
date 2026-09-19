const express = require("express");
const multer = require("multer");
const path = require("path");

const Document = require("../models/Document");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

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

    if (req.user.role === "customer") {
      const policy = await Policy.findOne({
        policyNumber: req.body.policyNumber,
        customerId: req.user.id,
      });

      if (!policy) {
        return res.status(403).json({ message: "Policy does not belong to this customer" });
      }
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
      customerId: req.user.role === "customer" ? req.user.id : req.body.customerId,
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

    await document.deleteOne();
    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Document delete error:", error);
    res.status(500).json({ message: "Document delete failed" });
  }
});

module.exports = router;