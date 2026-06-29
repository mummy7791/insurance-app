const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    userName: {
      type: String,
      default: "Unknown User",
    },

    userEmail: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      default: "agent",
    },

    action: {
      type: String,
      required: true,
    },

    module: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    ipAddress: {
      type: String,
      default: "",
    },
    targetUserId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);