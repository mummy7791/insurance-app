const mongoose = require("mongoose");

const policyPurchaseSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Policy",
      required: true,
    },

    policyName: {
      type: String,
      default: "",
    },

    policyNumber: {
      type: String,
      default: "",
    },

    premiumAmount: {
      type: Number,
      default: 0,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerEmail: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Active"],
      default: "Pending",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PolicyPurchase ||
  mongoose.model("PolicyPurchase", policyPurchaseSchema);