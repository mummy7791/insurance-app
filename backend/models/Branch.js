const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
    },

    branchCode: {
      type: String,
      required: true,
      unique: true,
    },

    city: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      default: "N/A",
    },

    bmName: {
      type: String,
      required: true,
    },

    phone: String,
    email: String,

    target: {
      type: Number,
      default: 0,
    },

    achievement: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);