const mongoose = require("mongoose");

const insurerCertificateSchema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanPurchase", required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  storagePublicId: { type: String, required: true },
  sha256: { type: String, required: true },
  originalName: { type: String, required: true },
  byteSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.models.InsurerCertificate || mongoose.model("InsurerCertificate", insurerCertificateSchema);
