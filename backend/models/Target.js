const mongoose = require("mongoose");

const targetSchema = new mongoose.Schema(
  {
    employee: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["Agent", "Agency Manager", "Unit Manager", "BM"],
      default: "Agent",
    },

    month: {
      type: String,
      required: true,
    },

    target: {
      type: Number,
      required: true,
    },

    achieved: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Achieved"],
      default: "Pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Target", targetSchema);