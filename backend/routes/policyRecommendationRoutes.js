const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getPolicyName = (policy) => {
  return String(
    policy.policyName ||
      policy.name ||
      policy.title ||
      policy.planName ||
      "Policy"
  );
};

const getPolicyPremium = (policy) => {
  return toNumber(
    policy.premiumAmount ||
      policy.amount ||
      policy.monthlyPremium ||
      policy.premium ||
      0
  );
};

router.get("/test", (req, res) => {
  res.json({
    message: "Policy Recommendation Route Working",
  });
});

router.post("/", auth(), async (req, res) => {
  try {
    const age = toNumber(req.body.age);
    const income = toNumber(req.body.income);
    const familyMembers = toNumber(req.body.familyMembers);
    const budget = toNumber(req.body.budget);
    const occupation = String(req.body.occupation || "").toLowerCase();
    const goal = String(req.body.goal || "").toLowerCase();

    if (!age || !income || !budget || !goal) {
      return res.status(400).json({
        message: "Age, income, budget and goal are required",
      });
    }

    const policies = await Policy.find().sort({ createdAt: -1 }).limit(100);

    const recommendations = policies.map((policy) => {
      let score = 40;

      const policyName = getPolicyName(policy);
      const policyNameLower = policyName.toLowerCase();
      const policyPremium = getPolicyPremium(policy);

      if (policyPremium > 0 && policyPremium <= budget) score += 25;
      if (income >= 300000) score += 5;
      if (income >= 600000) score += 5;

      if (age < 35 && policyNameLower.includes("term")) score += 15;
      if (age >= 35 && policyNameLower.includes("life")) score += 15;
      if (familyMembers > 2 && policyNameLower.includes("health")) score += 15;

      if (goal.includes("health") && policyNameLower.includes("health")) {
        score += 20;
      }

      if (goal.includes("tax") && policyNameLower.includes("tax")) {
        score += 15;
      }

      if (goal.includes("life") && policyNameLower.includes("life")) {
        score += 20;
      }

      if (goal.includes("investment") && policyNameLower.includes("investment")) {
        score += 15;
      }

      if (occupation.includes("business") && policyNameLower.includes("life")) {
        score += 10;
      }

      score = Math.max(0, Math.min(100, Math.round(score)));

      return {
        _id: policy._id,
        policyName,
        policyNumber: policy.policyNumber || policy.number || "",
        premiumAmount: policyPremium,
        status: policy.status || "active",
        score,
        reason:
          score >= 80
            ? "Best match based on budget, goal and customer profile."
            : score >= 60
            ? "Good match. Review benefits before recommending."
            : "Basic match. Recommend only if customer requests this type.",
      };
    });

    recommendations.sort((a, b) => b.score - a.score);

    res.json(recommendations.slice(0, 10));
  } catch (error) {
    console.error("Policy recommendation error:", error);
    res.status(500).json({ message: "Policy recommendation failed" });
  }
});

module.exports = router;