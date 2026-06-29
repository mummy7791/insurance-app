const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    city: String,

    email: String,

    occupation: String,

    income: Number,

    status: {
      type: String,
      default: "New",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", LeadSchema);