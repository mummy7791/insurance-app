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
      enum: ["Scheduled", "Completed", "Missed", "Called", "No Answer", "Customer Will Pay", "Payment Link Sent", "Follow-up Later", "Not Interested"],
      default: "Scheduled",
    },

    policyNumber: { type: String, default: "", index: true },
    premiumId: { type: mongoose.Schema.Types.ObjectId, ref: "Premium", default: null, index: true },
    advisorCode: { type: String, default: "" },
    nextFollowupDate: { type: String, default: "" },

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