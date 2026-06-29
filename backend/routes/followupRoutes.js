const express = require("express");
const router = express.Router();

const Followup = require("../models/Followup");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const followup = await Followup.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(followup);
  } catch (error) {
    console.error("Followup create error:", error);
    res.status(500).json({ message: "Followup create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const followups = await Followup.find().sort({ createdAt: -1 });
    res.json(followups);
  } catch (error) {
    console.error("Followups fetch error:", error);
    res.status(500).json({ message: "Followups fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const followup = await Followup.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(followup);
  } catch (error) {
    console.error("Followup update error:", error);
    res.status(500).json({ message: "Followup update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Followup.findByIdAndDelete(req.params.id);
    res.json({ message: "Followup deleted" });
  } catch (error) {
    console.error("Followup delete error:", error);
    res.status(500).json({ message: "Followup delete failed" });
  }
});

module.exports = router;