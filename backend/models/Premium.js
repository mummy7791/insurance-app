const mongoose = require("mongoose");

const premiumSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
    },

    policyNumber: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    dueDate: {
      type: String,
      required: true,
    },

    paidDate: {
      type: String,
      default: "",
    },

    paymentMode: {
      type: String,
      enum: ["UPI", "Cash", "Card", "Net Banking"],
      default: "UPI",
    },

    receiptNumber: String,

    gatewayOrderId: { type: String, default: "" },
    gatewayPaymentId: { type: String, default: "" },

    status: {
      type: String,
      enum: ["Upcoming", "Due", "Grace Period", "Overdue", "Lapsed", "Paid"],
      default: "Due",
    },

    lifecycleUpdatedAt: { type: Date, default: Date.now },
    reminderStage: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Premium", premiumSchema);