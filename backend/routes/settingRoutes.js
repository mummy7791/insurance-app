const express = require("express");
const router = express.Router();

const Setting = require("../models/Setting");
const auth = require("../middleware/auth");

const pickSettingFields = (body = {}) => {
  const allowedFields = [
    "companyName",
    "logoText",
    "supportPhone",
    "supportEmail",
    "defaultCommissionRate",
    "theme",
    "currency",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

router.get("/", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
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
    const payload = pickSettingFields(req.body);

    if (!setting) {
      setting = await Setting.create({
        ...payload,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });
    } else {
      setting = await Setting.findByIdAndUpdate(
        setting._id,
        {
          ...payload,
          updatedBy: req.user.id,
        },
        { new: true, runValidators: true }
      );
    }

    res.json(setting);
  } catch (error) {
    console.error("Setting update error:", error);
    res.status(500).json({ message: "Setting update failed" });
  }
});

module.exports = router;