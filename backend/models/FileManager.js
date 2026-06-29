const mongoose = require("mongoose");

const fileManagerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["Customer", "Policy", "Claim", "KYC", "Receipt", "Other"],
      default: "Other",
    },

    fileName: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      default: "",
    },

    filePath: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
    },

    linkedId: {
      type: String,
      default: "",
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.FileManager ||
  mongoose.model("FileManager", fileManagerSchema);