const express = require("express");
const router = express.Router();

const Branch = require("../models/Branch");
const auth = require("../middleware/auth");

router.post("/", auth(["admin", "bm"]), async (req, res) => {
  try {
    const branch = await Branch.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(branch);
  } catch (error) {
    console.error("Branch create error:", error);
    res.status(500).json({ message: "Branch create failed" });
  }
});

router.get("/", auth(["admin", "bm"]), async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.json(branches);
  } catch (error) {
    console.error("Branches fetch error:", error);
    res.status(500).json({ message: "Branches fetch failed" });
  }
});

router.put("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(branch);
  } catch (error) {
    console.error("Branch update error:", error);
    res.status(500).json({ message: "Branch update failed" });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    await Branch.findByIdAndDelete(req.params.id);
    res.json({ message: "Branch deleted" });
  } catch (error) {
    console.error("Branch delete error:", error);
    res.status(500).json({ message: "Branch delete failed" });
  }
});

module.exports = router;