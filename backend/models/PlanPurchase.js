const mongoose = require("mongoose");

const planPurchaseSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsurancePlan",
      required: true,
    },

    planName: { type: String, default: "" },
    category: { type: String, default: "" },

    coverageAmount: { type: Number, default: 0 },
    yearlyPremium: { type: Number, default: 0 },
    paymentYears: { type: Number, default: 1 },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    policyStatus: {
      type: String,
      enum: ["Active", "Inactive", "Cancelled"],
      default: "Inactive",
    },

    paymentMethod: {
      type: String,
      enum: ["Online", "Cash", "UPI", "Card"],
      default: "Online",
    },

    transactionId: { type: String, default: "" },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlanPurchase ||
  mongoose.model("PlanPurchase", planPurchaseSchema);