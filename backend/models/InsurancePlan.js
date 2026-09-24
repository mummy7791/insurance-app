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

    productGroup: {
      type: String,
      enum: ["ULIPS", "Traditional Products", "Term / Health Products", "Pension Products", "iSolutions", "Other"],
      default: "Other",
    },

    policyTermYears: { type: Number, default: 1 },
    premiumFrequencies: { type: [String], default: ["Yearly", "Half-Yearly", "Quarterly", "Monthly"] },
    firstYearPremium: { type: Number, default: 0 },
    subsequentYearPremium: { type: Number, default: 0 },
    maturityAges: { type: [Number], default: [] },
    premiumPayingTerms: { type: [Number], default: [] },
    pptPremiumFactors: { type: Map, of: Number, default: {} },
    loanRules: {
      enabled: { type: Boolean, default: false },
      eligibleFromPolicyYear: { type: Number, default: 0 },
      maxPercentOfPaidPremium: { type: Number, default: 0 },
      partialWithdrawalEnabled: { type: Boolean, default: false },
    },

    surrenderRules: {
      enabled: { type: Boolean, default: false },
      eligibleFromPolicyYear: { type: Number, default: 0 },
      valuePercentOfPaidPremium: { type: Number, default: 0 },
    },

    revivalRules: {
      enabled: { type: Boolean, default: false },
      maxLapseDays: { type: Number, default: 730 },
      lateFeePercent: { type: Number, default: 0 },
      medicalReviewRequired: { type: Boolean, default: false },
      kycReviewRequired: { type: Boolean, default: false },
    },

    freeLookRules: {
      enabled: { type: Boolean, default: false },
      days: { type: Number, default: 0 },
    },

    pricingRules: {
      baseAge: { type: Number, default: 25 },
      ageRatePercent: { type: Number, default: 2 },
      smokerLoadingPercent: { type: Number, default: 15 },
      femaleDiscountPercent: { type: Number, default: 0 },
    },

    benefitRules: {
      benefitType: { type: String, enum: ["Life Cover", "Guaranteed Income", "Pension Income", "Maturity Benefit", "Custom"], default: "Life Cover" },
      payoutStartYear: { type: Number, default: 0 },
      payoutYears: { type: Number, default: 0 },
      annualPayout: { type: Number, default: 0 },
      maturityAmount: { type: Number, default: 0 },
      deathBenefit: { type: Number, default: 0 },
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

    advisorCommissionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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