const express = require("express");
const router = express.Router();

const Followup = require("../models/Followup");
const auth = require("../middleware/auth");

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "advisor",
  "agent",
];

const pickFollowupFields = (body = {}) => {
  const allowedFields = [
    "customerName",
    "phone",
    "followType",
    "date",
    "time",
    "status",
    "remarks",
    "policyNumber",
    "premiumId",
    "advisorCode",
    "nextFollowupDate",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

router.post("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const payload = pickFollowupFields(req.body);

    const followup = await Followup.create({
      ...payload,
      createdBy: req.user.id,
    });

    res.status(201).json(followup);
  } catch (error) {
    console.error("Followup create error:", error);
    res.status(500).json({ message: "Followup create failed" });
  }
});

router.get("/summary", auth(STAFF_ROLES), async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const todayKey = today.toISOString().slice(0,10), tomorrowKey = tomorrow.toISOString().slice(0,10);
    const [todayCount,tomorrowCount,missed,promiseToPay] = await Promise.all([
      Followup.countDocuments({ nextFollowupDate: todayKey }),
      Followup.countDocuments({ nextFollowupDate: tomorrowKey }),
      Followup.countDocuments({ $or:[{status:"Missed"},{nextFollowupDate:{$lt:todayKey,$ne:""},status:{$nin:["Completed","Customer Will Pay","Not Interested"]}}] }),
      Followup.countDocuments({ status:"Customer Will Pay" }),
    ]);
    res.json({today:todayCount,tomorrow:tomorrowCount,missed,promiseToPay});
  } catch(error){ console.error("Followup summary error:",error); res.status(500).json({message:"Followup summary failed"}); }
});

router.get("/", auth(STAFF_ROLES), async (req, res) => {
  try {
    const followups = await Followup.find().sort({ createdAt: -1 });
    res.json(followups);
  } catch (error) {
    console.error("Followups fetch error:", error);
    res.status(500).json({ message: "Followups fetch failed" });
  }
});

router.put("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    const payload = pickFollowupFields(req.body);

    const followup = await Followup.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!followup) {
      return res.status(404).json({ message: "Followup not found" });
    }

    res.json(followup);
  } catch (error) {
    console.error("Followup update error:", error);
    res.status(500).json({ message: "Followup update failed" });
  }
});

router.delete("/:id", auth(STAFF_ROLES), async (req, res) => {
  try {
    await Followup.findByIdAndDelete(req.params.id);
    res.json({ message: "Followup deleted" });
  } catch (error) {
    console.error("Followup delete error:", error);
    res.status(500).json({ message: "Followup delete failed" });
  }
});

module.exports = router;