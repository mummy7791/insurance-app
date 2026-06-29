const router = require("express").Router();
const Premium = require("../models/Premium");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const premium = await Premium.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(premium);
  } catch (error) {
    console.error("Premium create error:", error);
    res.status(500).json({ message: "Premium create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const premiums = await Premium.find().sort({ createdAt: -1 });
    res.json(premiums);
  } catch (error) {
    console.error("Premiums fetch error:", error);
    res.status(500).json({ message: "Premiums fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const premium = await Premium.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(premium);
  } catch (error) {
    console.error("Premium update error:", error);
    res.status(500).json({ message: "Premium update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Premium.findByIdAndDelete(req.params.id);
    res.json({ message: "Premium deleted" });
  } catch (error) {
    console.error("Premium delete error:", error);
    res.status(500).json({ message: "Premium delete failed" });
  }
});

module.exports = router;