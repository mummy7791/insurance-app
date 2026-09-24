const mongoose = require("mongoose");

const planPurchaseSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsurancePlan",
      required: true,
    },

    planName: { type: String, default: "" },
    category: { type: String, default: "" },

    coverageAmount: { type: Number, default: 0 },
    yearlyPremium: { type: Number, default: 0 },
    paymentYears: { type: Number, default: 1 },
    policyTermYears: { type: Number, default: 1 },
    entryAge: { type: Number, default: 0 },
    coverTillAge: { type: Number, default: 0 },
    benefitType: { type: String, default: "" },
    benefitSchedule: { type: [mongoose.Schema.Types.Mixed], default: [] },
    maturityAmount: { type: Number, default: 0 },
    deathBenefit: { type: Number, default: 0 },
    firstYearPremium: { type: Number, default: 0 },
    subsequentYearPremium: { type: Number, default: 0 },
    premiumFrequency: { type: String, default: "Yearly" },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null, index: true },
    quotationNumber: { type: String, default: "", index: true },
    advisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    advisorCode: { type: String, default: "", index: true },
    advisorCommissionRate: { type: Number, default: 0 },

    proposal: {
      customerName: { type: String, default: "" },
      customerEmail: { type: String, default: "" },
      customerPhone: { type: String, default: "" },
      address: { type: String, default: "" },
      dateOfBirth: { type: String, default: "" },
      panNumber: { type: String, default: "", select: false },
      nomineeName: { type: String, default: "" },
      nomineeRelation: { type: String, default: "" },
      nomineeDateOfBirth: { type: String, default: "" },
      advisorCode: { type: String, default: "" },
      consentedAt: { type: Date, default: null },
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    policyStatus: {
      type: String,
      enum: ["Active", "Inactive", "Cancelled"],
      default: "Inactive",
    },

    paymentMethod: {
      type: String,
      enum: ["Online", "Cash", "UPI", "Card"],
      default: "Online",
    },

    // Unique payment references are assigned only after the corresponding event.
    // Partial indexes below ignore legacy empty-string values from older records.
    transactionId: { type: String, default: undefined },
    orderId: { type: String, default: undefined },
    policyNumber: { type: String, default: undefined },
    receiptNumber: { type: String, default: undefined },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    nextPremiumDate: { type: Date, default: null },
    totalPremiumPayable: { type: Number, default: 0 },
  },
  { timestamps: true }
);

planPurchaseSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $type: "string", $gt: "" } } }
);
planPurchaseSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: "string", $gt: "" } } }
);
planPurchaseSchema.index(
  { policyNumber: 1 },
  { unique: true, partialFilterExpression: { policyNumber: { $type: "string", $gt: "" } } }
);
planPurchaseSchema.index(
  { receiptNumber: 1 },
  { unique: true, partialFilterExpression: { receiptNumber: { $type: "string", $gt: "" } } }
);

module.exports =
  mongoose.models.PlanPurchase ||
  mongoose.model("PlanPurchase", planPurchaseSchema);