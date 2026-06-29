const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

const createAuditLog = async ({
  req,
  action,
  module,
  description,
  targetUserId,
}) => {
  try {
    let user = null;

    if (req?.user?.id) {
      user = await User.findById(req.user.id).select("name email role");
    }

    await AuditLog.create({
      userId: user?._id || req?.user?.id,
      userName: user?.name || "Unknown User",
      userEmail: user?.email || "",
      role: user?.role || req?.user?.role || "agent",
      action,
      module,
      description,
      ipAddress: req?.ip || "",
      targetUserId: targetUserId || null,
    });
  } catch (error) {
    console.error("Audit log helper error:", error.message);
  }
};

module.exports = createAuditLog;