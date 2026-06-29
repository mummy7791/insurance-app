const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "bm",
        "unit_manager",
        "agency_manager",
        "advisor",
        "agent",
        "customer",
      ],
      default: "customer",
    },

    branch: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    otp: {
      type: String,
      default: "",
    },

    otpExpires: {
      type: Date,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    permissions: {
      type: [String],
      default: [],
    },

    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);