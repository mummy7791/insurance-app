const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true },
    phone: String,
    photo: String,

    dob: String,
    gender: String,
    address: String,
    aadhaar: String,
    pan: String,

    nominee: String,
    nomineeRelation: String,

    advisor: String,
    agencyManager: String,
    branch: String,

    planName: String,
    policyNo: String,
    policyType: String,
    status: { type: String, default: "ACTIVE" },

    premium: String,
    coverage: String,
    startDate: String,
    expiryDate: String,
    renewalDate: String,

    members: [String],

    lastPayment: String,
    nextPremium: String,
    paymentMode: String,
    transactionId: String,

    claimsRaised: { type: Number, default: 0 },
    approvedClaims: { type: Number, default: 0 },
    pendingClaims: { type: Number, default: 0 },
    rejectedClaims: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);