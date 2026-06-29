const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    phone: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["Agent", "Agency Manager", "Unit Manager", "BM", "Admin"],
      default: "Agent",
    },

    branch: {
      type: String,
      required: true,
    },

    manager: {
      type: String,
      default: "Not Assigned",
    },

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

module.exports = mongoose.model("Employee", employeeSchema);