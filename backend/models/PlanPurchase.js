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

    proposal: {
      customerName: { type: String, default: "" },
      customerEmail: { type: String, default: "" },
      customerPhone: { type: String, default: "" },
      address: { type: String, default: "" },
      dateOfBirth: { type: String, default: "" },
      panNumber: { type: String, default: "", select: false },
      nomineeName: { type: String, default: "" },
      nomineeRelation: { type: String, default: "" },
      nomineeDateOfBirth: { type: String, default: "" },
      consentedAt: { type: Date, default: null },
    },

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

    transactionId: { type: String, default: "", unique: true, sparse: true },
    orderId: { type: String, default: undefined, unique: true, sparse: true },
    policyNumber: { type: String, default: "", unique: true, sparse: true },
    receiptNumber: { type: String, default: "", unique: true, sparse: true },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlanPurchase ||
  mongoose.model("PlanPurchase", planPurchaseSchema);