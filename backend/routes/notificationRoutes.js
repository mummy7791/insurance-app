const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

const STAFF_ROLES = ["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"];
const isStaff = (user) => STAFF_ROLES.includes(user.role);

router.post("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const { title, message, type, date, recipientId } = req.body;
    const notification = await Notification.create({
      title,
      message,
      type,
      date,
      recipientId: recipientId || undefined,
      createdBy: req.user.id,
    });

    req.app.get("io").emit("newNotification", notification);
    res.status(201).json(notification);
  } catch (error) {
    console.error("Notification create error:", error);
    res.status(500).json({ message: "Notification create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
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

    const notification = await Notification.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    req.app.get("io").emit("notificationUpdated", notification);
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

    req.app.get("io").emit("notificationDeleted", req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Notification delete error:", error);
    res.status(500).json({ message: "Notification delete failed" });
  }
});

module.exports = router;
