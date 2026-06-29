const express = require("express");
const router = express.Router();

const AuditLog = require("../models/AuditLog");
const auth = require("../middleware/auth");

router.get("/", auth(["admin", "bm"]), async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500);
    res.json(logs);
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    res.status(500).json({ message: "Audit logs fetch failed" });
  }
});

router.post("/", auth(), async (req, res) => {
  try {
    const log = await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name || "User",
      userEmail: req.user.email || "",
      role: req.user.role || "agent",
      action: req.body.action,
      module: req.body.module,
      description: req.body.description,
      ipAddress: req.ip,
    });

    res.status(201).json(log);
  } catch (error) {
    console.error("Audit log create error:", error);
    res.status(500).json({ message: "Audit log create failed" });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    await AuditLog.findByIdAndDelete(req.params.id);
    res.json({ message: "Audit log deleted" });
  } catch (error) {
    console.error("Audit log delete error:", error);
    res.status(500).json({ message: "Audit log delete failed" });
  }
});

module.exports = router;