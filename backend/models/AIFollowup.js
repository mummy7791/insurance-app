const mongoose = require("mongoose");

const aiFollowupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["Lead", "Premium", "Policy", "Claim", "Customer"],
      default: "Lead",
    },

    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },

    followupDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    sourceModel: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIFollowup", aiFollowupSchema);