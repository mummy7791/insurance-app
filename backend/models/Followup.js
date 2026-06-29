const mongoose = require("mongoose");

const followupSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    followType: {
      type: String,
      enum: ["Call", "Meeting", "Premium Reminder", "Policy Discussion", "KYC"],
      default: "Call",
    },

    date: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Missed"],
      default: "Scheduled",
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

module.exports = mongoose.model("Followup", followupSchema);