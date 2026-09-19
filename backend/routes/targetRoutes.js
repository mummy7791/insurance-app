const express = require("express");
const router = express.Router();

const Target = require("../models/Target");
const auth = require("../middleware/auth");

const pickTargetFields = (body = {}) => {
  const allowedFields = [
    "employee",
    "role",
    "month",
    "target",
    "achieved",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

const getStatus = (target, achieved) => {
  if (achieved >= target) return "Achieved";
  if (achieved > 0) return "In Progress";
  return "Pending";
};

router.post(
  "/",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const payload = pickTargetFields(req.body);
      const targetValue = Number(payload.target || 0);
      const achievedValue = Number(payload.achieved || 0);

      const target = await Target.create({
        ...payload,
        target: targetValue,
        achieved: achievedValue,
        status: getStatus(targetValue, achievedValue),
        createdBy: req.user.id,
      });

      res.status(201).json(target);
    } catch (error) {
      console.error("Target create error:", error);
      res.status(500).json({ message: "Target create failed" });
    }
  }
);

router.get(
  "/",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const targets = await Target.find().sort({ createdAt: -1 });
      res.json(targets);
    } catch (error) {
      console.error("Targets fetch error:", error);
      res.status(500).json({ message: "Targets fetch failed" });
    }
  }
);

router.put(
  "/:id",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const existingTarget = await Target.findById(req.params.id);

      if (!existingTarget) {
        return res.status(404).json({ message: "Target not found" });
      }

      const payload = pickTargetFields(req.body);

      const targetValue = Object.prototype.hasOwnProperty.call(payload, "target")
        ? Number(payload.target)
        : existingTarget.target;

      const achievedValue = Object.prototype.hasOwnProperty.call(payload, "achieved")
        ? Number(payload.achieved)
        : existingTarget.achieved;

      Object.assign(existingTarget, payload);
      existingTarget.target = targetValue;
      existingTarget.achieved = achievedValue;
      existingTarget.status = getStatus(targetValue, achievedValue);

      await existingTarget.save();

      res.json(existingTarget);
    } catch (error) {
      console.error("Target update error:", error);
      res.status(500).json({ message: "Target update failed" });
    }
  }
);

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    await Target.findByIdAndDelete(req.params.id);
    res.json({ message: "Target deleted" });
  } catch (error) {
    console.error("Target delete error:", error);
    res.status(500).json({ message: "Target delete failed" });
  }
});

module.exports = router;