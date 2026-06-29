const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: String,
    city: String,
    occupation: String,
    income: Number,

    leadStatus: {
      type: String,
      enum: ["new", "followup", "converted", "rejected"],
      default: "new",
    },

    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);