const express = require("express");
const router = express.Router();

const Branch = require("../models/Branch");
const auth = require("../middleware/auth");

const pickBranchFields = (body = {}) => {
  const allowedFields = [
    "branchName",
    "branchCode",
    "city",
    "address",
    "bmName",
    "phone",
    "email",
    "target",
    "achievement",
    "status",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

router.post("/", auth(["admin", "bm"]), async (req, res) => {
  try {
    const payload = pickBranchFields(req.body);

    const branch = await Branch.create({
      ...payload,
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
    const payload = pickBranchFields(req.body);

    const branch = await Branch.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

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