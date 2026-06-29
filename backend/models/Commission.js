const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
    },

    employeeRole: {
      type: String,
      enum: [
        "Agent",
        "Agency Manager",
        "Unit Manager",
        "BM",
        "Admin",
      ],
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    policyNumber: {
      type: String,
      required: true,
    },

    premiumAmount: {
      type: Number,
      required: true,
    },

    commissionRate: {
      type: Number,
      required: true,
    },

    commissionAmount: {
      type: Number,
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Commission", commissionSchema);