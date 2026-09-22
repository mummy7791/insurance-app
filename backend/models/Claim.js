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

    claimNumber: { type: String, index: true },
    settlementAmount: { type: Number },
    settlementDate: { type: String },
    settlementReference: { type: String },
    documentsStatus: { type: String, enum: ["Not Requested", "Required", "Received", "Verified"], default: "Not Requested" },
    missingDocuments: { type: [String], default: [] },
    adminChecklistRemarks: { type: String, default: "" },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Claim", claimSchema);