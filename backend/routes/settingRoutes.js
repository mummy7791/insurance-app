const express = require("express");
const router = express.Router();

const Setting = require("../models/Setting");
const auth = require("../middleware/auth");

router.get("/", auth(), async (req, res) => {
  try {
    let setting = await Setting.findOne();

    if (!setting) {
      setting = await Setting.create({
        createdBy: req.user.id,
      });
    }

    res.json(setting);
  } catch (error) {
    console.error("Setting fetch error:", error);
    res.status(500).json({ message: "Setting fetch failed" });
  }
});

router.put("/", auth(["admin"]), async (req, res) => {
  try {
    let setting = await Setting.findOne();

    if (!setting) {
      setting = await Setting.create({
        ...req.body,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });
    } else {
      setting = await Setting.findByIdAndUpdate(
        setting._id,
        {
          ...req.body,
          updatedBy: req.user.id,
        },
        { new: true }
      );
    }

    res.json(setting);
  } catch (error) {
    console.error("Setting update error:", error);
    res.status(500).json({ message: "Setting update failed" });
  }
});

module.exports = router;