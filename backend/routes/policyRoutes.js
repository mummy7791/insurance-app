const router = require("express").Router();
const Policy = require("../models/Policy");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const policy = await Policy.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error("Policy create error:", error);
    res.status(500).json({ message: "Policy create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const policies = await Policy.find()
      .sort({ createdAt: -1 });

    res.json(policies);
  } catch (error) {
    console.error("Policies fetch error:", error);
    res.status(500).json({ message: "Policies fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(policy);
  } catch (error) {
    console.error("Policy update error:", error);
    res.status(500).json({ message: "Policy update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Policy.findByIdAndDelete(req.params.id);
    res.json({ message: "Policy deleted" });
  } catch (error) {
    console.error("Policy delete error:", error);
    res.status(500).json({ message: "Policy delete failed" });
  }
});

module.exports = router;