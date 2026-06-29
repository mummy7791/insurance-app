const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Lead = require("../models/Lead");

const calculateLeadScore = (lead) => {
  let score = 30;

  if (lead.phone) score += 15;
  if (lead.email) score += 15;
  if (lead.city) score += 10;
  if (lead.income || lead.annualIncome) score += 15;
  if (lead.source) score += 5;

  const status = (lead.status || lead.leadStatus || "").toLowerCase();

  if (status.includes("hot")) score += 20;
  if (status.includes("interested")) score += 15;
  if (status.includes("follow")) score += 10;
  if (status.includes("cold")) score -= 15;
  if (status.includes("lost")) score -= 30;

  score = Math.max(0, Math.min(100, score));

  let category = "Cold";
  if (score >= 75) category = "Hot";
  else if (score >= 45) category = "Warm";

  return { score, category };
};

router.get("/", auth(), async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });

    const scoredLeads = leads.map((lead) => {
      const result = calculateLeadScore(lead);

      return {
        _id: lead._id,
        name: lead.name || lead.customerName || "Unknown Lead",
        phone: lead.phone || "",
        email: lead.email || "",
        city: lead.city || "",
        status: lead.status || lead.leadStatus || "New",
        source: lead.source || "",
        score: result.score,
        category: result.category,
        createdAt: lead.createdAt,
      };
    });

    res.json(scoredLeads);
  } catch (error) {
    console.error("AI lead scoring error:", error);
    res.status(500).json({ message: "AI lead scoring failed" });
  }
});

module.exports = router;