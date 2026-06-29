const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
    },

    policyNumber: {
      type: String,
      required: true,
    },

    documentType: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    uploadedDate: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },

    remarks: {
      type: String,
      default: "No remarks",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);