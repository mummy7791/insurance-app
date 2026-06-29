const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const notification = await Notification.create({
      ...req.body,
      createdBy: req.user.id,
    });

    const io = req.app.get("io");
    io.emit("newNotification", notification);

    res.status(201).json(notification);
  } catch (error) {
    console.error("Notification create error:", error);
    res.status(500).json({ message: "Notification create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ message: "Notifications fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    const io = req.app.get("io");
    io.emit("notificationUpdated", notification);

    res.json(notification);
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({ message: "Notification update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);

    const io = req.app.get("io");
    io.emit("notificationDeleted", req.params.id);

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Notification delete error:", error);
    res.status(500).json({ message: "Notification delete failed" });
  }
});

module.exports = router;