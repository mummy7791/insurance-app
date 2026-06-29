const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
    },

    customerPhone: String,

    policyName: {
      type: String,
      required: true,
    },

    policyNumber: {
      type: String,
      required: true,
      unique: true,
    },

    premiumAmount: {
      type: Number,
      required: true,
    },

    sumAssured: {
      type: Number,
      default: 0,
    },

    paymentMode: {
      type: String,
      enum: ["monthly", "quarterly", "half_yearly", "yearly"],
      default: "monthly",
    },

    status: {
      type: String,
      enum: ["pending", "active", "rejected", "closed", "expired"],
      default: "pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Policy", policySchema);