const mongoose = require("mongoose");

const insurancePlanSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Life Insurance",
        "Health Insurance",
        "Medical Insurance",
        "Education Insurance",
        "Personal Accident Insurance",
        "Disability Insurance",
        "Cancer Insurance",
        "Maternity Insurance",
        "Travel Insurance",
        "Pension Retirement Plan",
      ],
      required: true,
    },

    planType: {
      type: String,
      default: "",
    },

    coverageAmount: {
      type: Number,
      default: 0,
    },

    yearlyPremium: {
      type: Number,
      default: 0,
    },

    yearlyAmount: {
      type: Number,
      default: 0,
    },

    paymentYears: {
      type: Number,
      default: 1,
    },

    ageMin: {
      type: Number,
      default: 0,
    },

    ageMax: {
      type: Number,
      default: 100,
    },

    eligibleFrom: {
      type: String,
      default: "",
    },

    eligibleTo: {
      type: String,
      default: "",
    },

    benefits: {
      type: [String],
      default: [],
    },

    coverage: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    premiumMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Active", "Inactive"],
      default: "Pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.InsurancePlan ||
  mongoose.model("InsurancePlan", insurancePlanSchema);