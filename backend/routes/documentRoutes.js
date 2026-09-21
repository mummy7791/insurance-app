const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { uploadPrivateDocument, signedDownloadUrl, deletePrivateDocument } = require("../services/privateDocumentStorage");

const Document = require("../models/Document");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

const router = express.Router();

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
];

const DOCUMENT_TYPES = new Set([
  "Aadhaar",
  "PAN",
  "Customer Photo",
  "Bank Passbook",
  "Cancelled Cheque",
  "Income Proof",
  "Address Proof",
  "Policy Document",
  "Nominee Photo",
  "Nominee Aadhaar",
  "Nominee PAN",
]);

const DOCUMENT_STATUSES = new Set([
  "Pending",
  "Verified",
  "Rejected",
]);

const REQUIRED_KYC_TYPES = ["Aadhaar", "PAN", "Customer Photo", "Address Proof"];\n\nconst syncPolicyKycStatus = async (policyNumber) => {\n  if (!policyNumber || String(policyNumber).startsWith("PENDING-")) return null;\n  const policy = await Policy.findOne({ policyNumber });\n  if (!policy) return null;\n  const documents = await Document.find({ policyNumber }).select("documentType status");\n  const latestByType = new Map();\n  for (const doc of documents) {\n    if (!latestByType.has(doc.documentType)) latestByType.set(doc.documentType, doc.status);\n  }\n  const requiredStatuses = REQUIRED_KYC_TYPES.map((type) => latestByType.get(type));\n  const hasRejected = requiredStatuses.some((status) => status === "Rejected");\n  const allVerified = requiredStatuses.every((status) => status === "Verified");\n  policy.kycStatus = hasRejected ? "Action Required" : allVerified ? "Verified" : "Pending";\n  policy.kycVerifiedAt = allVerified ? (policy.kycVerifiedAt || new Date()) : null;\n  await policy.save();\n  return policy.kycStatus;\n};\n\nconst normalizeText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const pickDocumentUpdateFields = (body = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, "customerName")) {
    payload.customerName = normalizeText(body.customerName, 120);
  }

  if (Object.prototype.hasOwnProperty.call(body, "documentType")) {
    const documentType = normalizeText(body.documentType, 50);
    if (!DOCUMENT_TYPES.has(documentType)) {
      return { error: "Invalid document type" };
    }
    payload.documentType = documentType;
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const status = normalizeText(body.status, 20);
    if (!DOCUMENT_STATUSES.has(status)) {
      return { error: "Invalid document status" };
    }
    payload.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(body, "remarks")) {
    payload.remarks = normalizeText(body.remarks, 500);
  }

  return { payload };
};

const storage = multer.memoryStorage();

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

const detectFileType = async (fileOrBuffer) => {
  const bytes = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer.subarray(0, 16) : Buffer.alloc(0);
  try {

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
  } finally {}
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

router.post("/proposal-kyc/:planId", auth(["customer"]), (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size must be 5 MB or less" });
    }
    return res.status(400).json({ message: error.message || "Invalid file upload" });
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "KYC file required" });

    const detectedMimeType = await detectFileType(req.file.buffer);
    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
      
      return res.status(400).json({ message: "File content does not match the allowed document type" });
    }

    const documentType = normalizeText(req.body.documentType, 50);
    const customerName = normalizeText(req.body.customerName, 120);
    if (!DOCUMENT_TYPES.has(documentType) || !customerName) {
      
      return res.status(400).json({ message: "Invalid KYC document details" });
    }

    const planId = normalizeText(req.params.planId, 80);
    if (!/^[a-f\d]{24}$/i.test(planId)) {
      
      return res.status(400).json({ message: "Invalid plan reference" });
    }

    const pendingPolicyNumber = `PENDING-${req.user.id}-${planId}`;
    const previous = await Document.findOne({
      customerId: req.user.id,
      policyNumber: pendingPolicyNumber,
      documentType,
    });
    if (previous?.storageProvider === "cloudinary" && previous.storageKey) {
      await deletePrivateDocument(previous.storageKey);
      await previous.deleteOne();
    } else if (previous) {
      await previous.deleteOne();
    }

    const stored = await uploadPrivateDocument({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      customerId: req.user.id,
      documentType,
    });

    const document = await Document.create({
      customerName,
      policyNumber: pendingPolicyNumber,
      documentType,
      fileName: normalizeText(req.file.originalname, 255) || "document",
      filePath: stored.secure_url || stored.url || "private-cloud",
      storageProvider: "cloudinary",
      storageKey: stored.public_id,
      resourceType: stored.resource_type || "raw",
      uploadedDate: new Date().toISOString().split("T")[0],
      status: "Pending",
      remarks: "Uploaded with online proposal - awaiting policy activation",
      customerId: req.user.id,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      id: document._id,
      documentType: document.documentType,
      fileName: document.fileName,
      status: document.status,
      uploadRef: pendingPolicyNumber,
    });
  } catch (error) {
    if (req.file?.path) {
      try {  } catch {}
    }
    console.error("Proposal KYC upload error:", error);
    return res.status(500).json({ message: "KYC document upload failed" });
  }
});

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

    const detectedMimeType = await detectFileType(req.file.buffer);
    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
      
      return res.status(400).json({ message: "File content does not match the allowed document type" });
    }

    const customerName = normalizeText(req.body.customerName, 120);
    const policyNumber = normalizeText(req.body.policyNumber, 100);
    const documentType = normalizeText(req.body.documentType, 50);
    const remarks = normalizeText(req.body.remarks, 500);

    if (!customerName) {
      
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!policyNumber) {
      
      return res.status(400).json({ message: "Policy number is required" });
    }

    if (!DOCUMENT_TYPES.has(documentType)) {
      
      return res.status(400).json({ message: "Invalid document type" });
    }

    const policy = await Policy.findOne({ policyNumber });
    if (!policy) {
      
      return res.status(404).json({ message: "Policy not found" });
    }

    if (req.user.role === "customer" && String(policy.customerId || "") !== String(req.user.id)) {
      
      return res.status(403).json({ message: "Policy does not belong to this customer" });
    }

    if (!policy.customerId) {
      
      return res.status(400).json({ message: "Policy is not linked to a customer account" });
    }

    const stored = await uploadPrivateDocument({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      customerId: policy.customerId,
      documentType,
    });

    const document = await Document.create({
      customerName,
      policyNumber,
      documentType,
      fileName: normalizeText(req.file.originalname, 255) || "document",
      filePath: stored.secure_url || stored.url || "private-cloud",
      storageProvider: "cloudinary",
      storageKey: stored.public_id,
      resourceType: stored.resource_type || "raw",
      uploadedDate: new Date().toISOString().split("T")[0],
      status: "Pending",
      remarks: remarks || "No remarks",
      customerId: policy.customerId,
      createdBy: req.user.id,
    });

    res.status(201).json(document);
  } catch (error) {
    if (req.file?.path) {
      try {
        
      } catch (cleanupError) {
        console.error("Document upload cleanup error:", cleanupError);
      }
    }

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

    const downloadName = path.basename(String(document.fileName || "document")).replace(/["\r\n]/g, "");
    if (document.storageProvider === "cloudinary" && document.storageKey) {
      const url = signedDownloadUrl(document.storageKey);
      const upstream = await fetch(url, { redirect: "follow" });
      if (!upstream.ok) {
        console.error("Cloud document fetch failed:", upstream.status, upstream.statusText);
        return res.status(502).json({ message: "Secure document could not be retrieved" });
      }
      const body = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(body.length));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Content-Disposition", `inline; filename="${downloadName}"`);
      return res.send(body);
    }
    const fileName = path.basename(document.filePath);
    const absolutePath = path.join(__dirname, "..", "uploads", fileName);
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

router.patch("/:id/review", auth(STAFF_ROLES), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    const status = normalizeText(req.body.status, 20);
    const remarks = normalizeText(req.body.remarks, 500);
    if (!["Verified", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Review status must be Verified or Rejected" });
    }
    if (status === "Rejected" && !remarks) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    document.status = status;
    document.remarks = remarks || "KYC document verified";
    document.reviewedBy = req.user.id;
    document.reviewedAt = new Date();
    await document.save();

    return res.json(document);
  } catch (error) {
    console.error("Document review error:", error);
    return res.status(500).json({ message: "Document review failed" });
  }
});

router.post("/:id/reupload", auth(["customer"]), (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size must be 5 MB or less" });
    }
    return res.status(400).json({ message: error.message || "Invalid file upload" });
  });
}, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      if (req.file?.path) 
      return res.status(404).json({ message: "Document not found" });
    }
    if (String(document.customerId || "") !== String(req.user.id) || document.status !== "Rejected") {
      if (req.file?.path) 
      return res.status(403).json({ message: "Only your rejected KYC document can be re-uploaded" });
    }
    if (!req.file) return res.status(400).json({ message: "Replacement file required" });

    const detectedMimeType = await detectFileType(req.file.buffer);
    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
      
      return res.status(400).json({ message: "File content does not match the allowed document type" });
    }

    const oldStorageKey = document.storageProvider === "cloudinary" ? document.storageKey : "";
    const stored = await uploadPrivateDocument({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      customerId: req.user.id,
      documentType: document.documentType,
    });
    document.fileName = normalizeText(req.file.originalname, 255) || "document";
    document.filePath = stored.secure_url || stored.url || "private-cloud";
    document.storageProvider = "cloudinary";
    document.storageKey = stored.public_id;
    document.resourceType = stored.resource_type || "raw";
    document.uploadedDate = new Date().toISOString().split("T")[0];
    document.status = "Pending";
    document.remarks = "Re-uploaded by customer - awaiting verification";
    document.reviewedBy = undefined;
    document.reviewedAt = undefined;
    await document.save();
    if (oldStorageKey) await deletePrivateDocument(oldStorageKey);

    return res.json(document);
  } catch (error) {
    if (req.file?.path) {
      try {  } catch {}
    }
    console.error("Document re-upload error:", error);
    return res.status(500).json({ message: "Document re-upload failed" });
  }
});

router.put("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    const update = pickDocumentUpdateFields(req.body);

    if (update.error) {
      return res.status(400).json({ message: update.error });
    }

    if (
      Object.prototype.hasOwnProperty.call(update.payload, "customerName") &&
      !update.payload.customerName
    ) {
      return res.status(400).json({ message: "Customer name cannot be empty" });
    }

    Object.assign(document, update.payload);
    await document.save();

    res.json(document);
  } catch (error) {
    console.error("Document update error:", error);
    res.status(500).json({ message: "Document update failed" });
  }
});

router.delete("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    const cloudKey = document.storageProvider === "cloudinary" ? document.storageKey : "";
    const fileName = document.storageProvider !== "cloudinary" ? path.basename(document.filePath || "") : "";
    const absolutePath = fileName ? path.join(__dirname, "..", "uploads", fileName) : null;

    await document.deleteOne();
    if (cloudKey) {
      try { await deletePrivateDocument(cloudKey); } catch (cloudError) {
        console.error("Cloud document cleanup error:", cloudError);
      }
    }

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