const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: "LifeSecure CRM",
    },

    logoText: {
      type: String,
      default: "🛡️ LifeSecure CRM",
    },

    supportPhone: {
      type: String,
      default: "9999999999",
    },

    supportEmail: {
      type: String,
      default: "support@lifesecure.com",
    },

    defaultCommissionRate: {
      type: Number,
      default: 10,
    },

    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },

    currency: {
      type: String,
      default: "INR",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);