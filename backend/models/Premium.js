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

    status: {
      type: String,
      enum: ["Due", "Paid", "Overdue"],
      default: "Due",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Premium", premiumSchema);