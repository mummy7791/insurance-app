const mongoose = require("mongoose");

const certificateAccessLogSchema = new mongoose.Schema({
  certificateId: { type: mongoose.Schema.Types.ObjectId, ref: "InsurerCertificate", required: true, index: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanPurchase", required: true, index: true },
  accessedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  accessRole: { type: String, enum: ["customer", "admin"], required: true }
}, { timestamps: true });

certificateAccessLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.CertificateAccessLog ||
  mongoose.model("CertificateAccessLog", certificateAccessLogSchema);
