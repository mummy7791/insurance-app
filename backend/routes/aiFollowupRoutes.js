const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const AIFollowup = require("../models/AIFollowup");
const Lead = require("../models/Lead");
const Premium = require("../models/Premium");
const Policy = require("../models/Policy");
const Claim = require("../models/Claim");

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
};

router.get("/", auth(), async (req, res) => {
  try {
    const followups = await AIFollowup.find()
      .sort({ followupDate: 1, createdAt: -1 })
      .limit(300);

    res.json(followups);
  } catch (error) {
    console.error("AI followups fetch error:", error);
    res.status(500).json({ message: "AI followups fetch failed" });
  }
});

router.get("/today", auth(), async (req, res) => {
  try {
    const followups = await AIFollowup.find({
      status: "Pending",
      followupDate: {
        $gte: startOfToday(),
        $lte: endOfToday(),
      },
    }).sort({ priority: 1, followupDate: 1 });

    res.json(followups);
  } catch (error) {
    console.error("Today followups error:", error);
    res.status(500).json({ message: "Today followups failed" });
  }
});

router.get("/overdue", auth(), async (req, res) => {
  try {
    const followups = await AIFollowup.find({
      status: "Pending",
      followupDate: { $lt: startOfToday() },
    }).sort({ followupDate: 1 });

    res.json(followups);
  } catch (error) {
    console.error("Overdue followups error:", error);
    res.status(500).json({ message: "Overdue followups failed" });
  }
});

router.get("/upcoming", auth(), async (req, res) => {
  try {
    const followups = await AIFollowup.find({
      status: "Pending",
      followupDate: {
        $gt: endOfToday(),
        $lte: addDays(7),
      },
    }).sort({ followupDate: 1 });

    res.json(followups);
  } catch (error) {
    console.error("Upcoming followups error:", error);
    res.status(500).json({ message: "Upcoming followups failed" });
  }
});

router.post("/generate", auth(), async (req, res) => {
  try {
    const created = [];

    const leads = await Lead.find().sort({ createdAt: -1 }).limit(10);

    for (const lead of leads) {
      const exists = await AIFollowup.findOne({
        sourceId: lead._id,
        sourceModel: "Lead",
        status: "Pending",
      });

      if (!exists) {
        const followup = await AIFollowup.create({
          title: `Call lead: ${lead.name || "New Lead"}`,
          description: `AI suggests contacting this lead soon to improve conversion.`,
          type: "Lead",
          priority: "High",
          followupDate: addDays(0),
          sourceId: lead._id,
          sourceModel: "Lead",
          createdBy: req.user.id,
        });

        created.push(followup);
      }
    }

    const premiums = await Premium.find({ status: { $ne: "paid" } })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(10);

    for (const premium of premiums) {
      const exists = await AIFollowup.findOne({
        sourceId: premium._id,
        sourceModel: "Premium",
        status: "Pending",
      });

      if (!exists) {
        const followup = await AIFollowup.create({
          title: `Premium due: ₹${premium.amount || 0}`,
          description: `AI suggests sending premium payment reminder to customer.`,
          type: "Premium",
          priority: "High",
          followupDate: premium.dueDate || addDays(0),
          sourceId: premium._id,
          sourceModel: "Premium",
          createdBy: req.user.id,
        });

        created.push(followup);
      }
    }

    const policies = await Policy.find({
      $or: [
        { expiryDate: { $lte: addDays(7) } },
        { renewalDate: { $lte: addDays(7) } },
      ],
    })
      .sort({ expiryDate: 1, renewalDate: 1 })
      .limit(10);

    for (const policy of policies) {
      const exists = await AIFollowup.findOne({
        sourceId: policy._id,
        sourceModel: "Policy",
        status: "Pending",
      });

      if (!exists) {
        const followup = await AIFollowup.create({
          title: `Policy renewal: ${policy.policyName || policy.policyNumber || "Policy"}`,
          description: `AI suggests contacting customer for policy renewal before expiry.`,
          type: "Policy",
          priority: "Medium",
          followupDate: policy.renewalDate || policy.expiryDate || addDays(1),
          sourceId: policy._id,
          sourceModel: "Policy",
          createdBy: req.user.id,
        });

        created.push(followup);
      }
    }

    const claims = await Claim.find({
      status: { $in: ["pending", "Submitted", "Under Review"] },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    for (const claim of claims) {
      const exists = await AIFollowup.findOne({
        sourceId: claim._id,
        sourceModel: "Claim",
        status: "Pending",
      });

      if (!exists) {
        const followup = await AIFollowup.create({
          title: `Review claim: ₹${claim.claimAmount || 0}`,
          description: `AI suggests reviewing this claim and updating claim status.`,
          type: "Claim",
          priority: "High",
          followupDate: addDays(0),
          sourceId: claim._id,
          sourceModel: "Claim",
          createdBy: req.user.id,
        });

        created.push(followup);
      }
    }

    res.status(201).json({
      message: "AI followups generated successfully",
      createdCount: created.length,
      followups: created,
    });
  } catch (error) {
    console.error("AI followup generate error:", error);
    res.status(500).json({ message: "AI followup generate failed" });
  }
});

router.put("/:id/complete", auth(), async (req, res) => {
  try {
    const followup = await AIFollowup.findByIdAndUpdate(
      req.params.id,
      { status: "Completed" },
      { new: true }
    );

    if (!followup) {
      return res.status(404).json({ message: "Follow-up not found" });
    }

    res.json(followup);
  } catch (error) {
    console.error("AI followup complete error:", error);
    res.status(500).json({ message: "AI followup complete failed" });
  }
});

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    const followup = await AIFollowup.findByIdAndDelete(req.params.id);

    if (!followup) {
      return res.status(404).json({ message: "Follow-up not found" });
    }

    res.json({ message: "AI follow-up deleted" });
  } catch (error) {
    console.error("AI followup delete error:", error);
    res.status(500).json({ message: "AI followup delete failed" });
  }
});

module.exports = router;