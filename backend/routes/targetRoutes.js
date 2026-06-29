const express = require("express");
const router = express.Router();

const Target = require("../models/Target");
const auth = require("../middleware/auth");

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
      const targetValue = Number(req.body.target || 0);
      const achievedValue = Number(req.body.achieved || 0);

      const target = await Target.create({
        ...req.body,
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
      const targetValue = Number(req.body.target || 0);
      const achievedValue = Number(req.body.achieved || 0);

      const updatedTarget = await Target.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          status: getStatus(targetValue, achievedValue),
        },
        { new: true }
      );

      res.json(updatedTarget);
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