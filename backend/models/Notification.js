const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "Premium Due",
        "Follow-up",
        "Policy Expiry",
        "Claim Update",
        "KYC Pending",
        "Target Alert",
      ],
      default: "Premium Due",
    },

    date: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Unread", "Read"],
      default: "Unread",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);