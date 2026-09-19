const router = require("express").Router();
const Lead = require("../models/Lead");
const auth = require("../middleware/auth");

const pickLeadFields = (body = {}) => {
  const allowedFields = [
    "name",
    "phone",
    "city",
    "email",
    "occupation",
    "income",
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

// Add Lead
router.post("/", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const payload = pickLeadFields(req.body);

    const lead = await Lead.create({
      ...payload,
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
router.get("/", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
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
router.put("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const payload = pickLeadFields(req.body);

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// Delete Lead
router.delete("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
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