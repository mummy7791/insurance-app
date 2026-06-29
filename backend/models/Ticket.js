const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Policy",
        "Premium",
        "Claim",
        "Payment",
        "KYC",
        "Technical",
        "Other",
      ],
      default: "Other",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Open",
        "In Progress",
        "Resolved",
        "Closed",
      ],
      default: "Open",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolution: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Ticket ||
  mongoose.model("Ticket", ticketSchema);