const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Lead = require("../models/Lead");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const User = require("../models/User");

router.get("/", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    const [leads, policies, premiums, agents] = await Promise.all([
      Lead.countDocuments(),
      Policy.countDocuments(),
      Premium.find(),
      User.countDocuments({ role: "agent" }),
    ]);

    const totalPremium = premiums.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const avgPremium = premiums.length > 0 ? totalPremium / premiums.length : 0;

    const predictedPolicies = Math.round(policies + leads * 0.25);
    const predictedRevenue = Math.round(totalPremium + avgPremium * leads * 0.25);
    const leadConversionPrediction =
      leads > 0 ? Math.round((policies / leads) * 100) : 0;

    res.json({
      current: {
        leads,
        policies,
        totalPremium,
        agents,
      },
      prediction: {
        nextMonthRevenue: predictedRevenue,
        expectedPolicies: predictedPolicies,
        leadConversion: Math.min(100, leadConversionPrediction),
        bestAction: "Increase follow-ups for hot leads and pending premiums.",
      },
    });
  } catch (error) {
    console.error("AI sales prediction error:", error);
    res.status(500).json({ message: "AI sales prediction failed" });
  }
});

module.exports = router;