const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
    },

    policyNumber: {
      type: String,
      required: true,
    },

    claimType: {
      type: String,
      enum: [
        "Death Claim",
        "Maturity Claim",
        "Surrender",
        "Loan Against Policy",
      ],
      required: true,
    },

    claimAmount: {
      type: Number,
      required: true,
    },

    submittedDate: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Submitted", "Under Review", "Approved", "Rejected", "Settled"],
      default: "Submitted",
    },

    remarks: {
      type: String,
      default: "No remarks",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Claim", claimSchema);