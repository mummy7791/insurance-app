const router = require("express").Router();
const Claim = require("../models/Claim");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const claim = await Claim.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error("Claim create error:", error);
    res.status(500).json({ message: "Claim create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const claims = await Claim.find().sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    console.error("Claims fetch error:", error);
    res.status(500).json({ message: "Claims fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(claim);
  } catch (error) {
    console.error("Claim update error:", error);
    res.status(500).json({ message: "Claim update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Claim.findByIdAndDelete(req.params.id);
    res.json({ message: "Claim deleted" });
  } catch (error) {
    console.error("Claim delete error:", error);
    res.status(500).json({ message: "Claim delete failed" });
  }
});

module.exports = router;