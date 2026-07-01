const mongoose = require("mongoose");

const ocrDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["Aadhaar", "PAN", "Driving License", "Passport", "Other"],
      default: "Other",
    },
    fileName: String,
    filePath: String,
    extractedText: {
      type: String,
      default: "",
    },
    extractedData: {
      name: String,
      dob: String,
      documentNumber: String,
      address: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Failed"],
      default: "Pending",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OCRDocument", ocrDocumentSchema);