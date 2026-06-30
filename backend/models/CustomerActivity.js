const mongoose = require("mongoose");

const customerActivitySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    activity: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "Policy",
        "Premium",
        "Claim",
        "Login",
        "KYC",
        "Payment",
        "Other",
      ],
      default: "Other",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.CustomerActivity ||
  mongoose.model("CustomerActivity", customerActivitySchema);