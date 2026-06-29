const router = require("express").Router();
const Lead = require("../models/Lead");
const auth = require("../middleware/auth");

// Add Lead
router.post("/", auth, async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// Get All Leads
router.get("/", auth, async (req, res) => {
  try {
    const leads = await Lead.find().sort({
      createdAt: -1,
    });

    res.json(leads);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// Update Lead
router.put("/:id", auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );

    res.json(lead);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// Delete Lead
router.delete("/:id", auth, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);

    res.json({
      message: "Lead Deleted",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;