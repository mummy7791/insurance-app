const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const User = require("../models/User");
const Premium = require("../models/Premium");
const Policy = require("../models/Policy");
const Document = require("../models/Document");
const auth = require("../middleware/auth");

const STAFF_ROLES = ["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"];
const isStaff = (user) => STAFF_ROLES.includes(user.role);
const userRoom = (userId) => `user:${String(userId)}`;

const emitToRecipient = (req, event, payload, recipientId) => {
  if (!recipientId) return;
  req.app.get("io").to(userRoom(recipientId)).emit(event, payload);
};

router.get("/recipients", auth(STAFF_ROLES), async (req, res) => {
  try {
    const recipients = await User.find({
      role: "customer",
      status: "active",
    })
      .select("_id name email phone")
      .sort({ name: 1, email: 1 })
      .lean();

    res.json(recipients);
  } catch (error) {
    console.error("Notification recipients fetch error:", error);
    res.status(500).json({ message: "Notification recipients fetch failed" });
  }
});

router.post("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const { title, message, type, date, recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: "Notification recipient required" });
    }

    const recipient = await User.findOne({
      _id: recipientId,
      role: "customer",
      status: "active",
    }).select("_id");

    if (!recipient) {
      return res.status(400).json({ message: "Invalid notification recipient" });
    }

    const notification = await Notification.create({
      title,
      message,
      type,
      date,
      recipientId,
      createdBy: req.user.id,
    });

    emitToRecipient(req, "newNotification", notification, notification.recipientId);
    res.status(201).json(notification);
  } catch (error) {
    console.error("Notification create error:", error);
    res.status(500).json({ message: "Notification create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    if (!isStaff(req.user)) {
      const policies = await Policy.find({ customerId: req.user.id }).select("policyNumber").lean();
      const policyNumbers = policies.map((policy) => policy.policyNumber).filter(Boolean);
      if (policyNumbers.length) {
        const today = new Date();
        const reminderUntil = new Date(today);
        reminderUntil.setDate(reminderUntil.getDate() + 30);
        const from = today.toISOString().split("T")[0];
        const to = reminderUntil.toISOString().split("T")[0];
        const duePremiums = await Premium.find({
          policyNumber: { $in: policyNumbers },
          status: { $in: ["Due", "Overdue"] },
          dueDate: { $gte: from, $lte: to },
        }).lean();

        for (const premium of duePremiums) {
          const title = "Upcoming premium due";
          const message = `Premium of INR ${Number(premium.amount || 0).toLocaleString("en-IN")} for policy ${premium.policyNumber} is due on ${premium.dueDate}.`;
          const existing = await Notification.findOne({
            recipientId: req.user.id,
            type: "Premium Due",
            title,
            message,
          }).select("_id");
          if (!existing) {
            const notification = await Notification.create({
              title,
              message,
              type: "Premium Due",
              date: premium.dueDate,
              recipientId: req.user.id,
            });
            emitToRecipient(req, "newNotification", notification, req.user.id);
          }
        }
      }

      const kycDocuments = await Document.find({ customerId: req.user.id })
        .select("_id policyNumber documentType status remarks uploadedDate updatedAt")
        .lean();

      for (const document of kycDocuments) {
        const reference = "kyc:" + document._id;
        const status = document.status || "Pending";
        const config = status === "Verified"
          ? { type: "KYC Verified", title: "KYC document verified", message: document.documentType + " for policy " + document.policyNumber + " has been verified.", actionLabel: "View documents", actionUrl: "/documents" }
          : status === "Rejected"
            ? { type: "KYC Action Required", title: "KYC document needs attention", message: document.documentType + " for policy " + document.policyNumber + " was rejected" + (document.remarks && document.remarks !== "No remarks" ? ": " + document.remarks : "."), actionLabel: "Re-upload document", actionUrl: "/documents" }
            : { type: "KYC Pending", title: "KYC verification pending", message: document.documentType + " for policy " + document.policyNumber + " is awaiting verification.", actionLabel: "View documents", actionUrl: "/documents" };

        const existing = await Notification.findOne({ recipientId: req.user.id, reference });
        if (!existing) {
          const notification = await Notification.create({
            ...config,
            date: document.uploadedDate || new Date(document.updatedAt || Date.now()).toISOString().split("T")[0],
            recipientId: req.user.id,
            reference,
          });
          emitToRecipient(req, "newNotification", notification, req.user.id);
        } else if (existing.type !== config.type || existing.title !== config.title || existing.message !== config.message) {
          Object.assign(existing, config, { status: "Unread" });
          await existing.save();
          emitToRecipient(req, "notificationUpdated", existing, req.user.id);
        }
      }
    }

    const filter = isStaff(req.user) ? {} : { recipientId: req.user.id };
    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ message: "Notifications fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const staff = isStaff(req.user);
    const filter = staff
      ? { _id: req.params.id }
      : { _id: req.params.id, recipientId: req.user.id };

    const existing = await Notification.findOne(filter);
    if (!existing) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const previousRecipientId = existing.recipientId;

    let updates;
    if (staff) {
      const { title, message, type, date, status, recipientId } = req.body;
      updates = {};
      if (title !== undefined) updates.title = title;
      if (message !== undefined) updates.message = message;
      if (type !== undefined) updates.type = type;
      if (date !== undefined) updates.date = date;
      if (status !== undefined) updates.status = status;
      if (recipientId !== undefined) updates.recipientId = recipientId;
    } else {
      if (!["Read", "Unread"].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid notification status" });
      }
      updates = { status: req.body.status };
    }

    Object.assign(existing, updates);
    const notification = await existing.save();

    if (
      previousRecipientId &&
      String(previousRecipientId) !== String(notification.recipientId)
    ) {
      emitToRecipient(req, "notificationDeleted", notification._id, previousRecipientId);
    }

    emitToRecipient(
      req,
      "notificationUpdated",
      notification,
      notification.recipientId
    );

    res.json(notification);
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({ message: "Notification update failed" });
  }
});

router.delete("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    emitToRecipient(
      req,
      "notificationDeleted",
      notification._id,
      notification.recipientId
    );

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Notification delete error:", error);
    res.status(500).json({ message: "Notification delete failed" });
  }
});

module.exports = router;
