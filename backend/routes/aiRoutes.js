const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const User = require("../models/User");

router.get("/summary", auth(), async (req, res) => {
  try {
    const [
      leads,
      customers,
      policies,
      premiums,
      claims,
      users,
      duePremiums,
      pendingClaims,
    ] = await Promise.all([
      Lead.countDocuments(),
      Customer.countDocuments(),
      Policy.countDocuments(),
      Premium.countDocuments(),
      Claim.countDocuments(),
      User.countDocuments(),
      Premium.find({ status: { $ne: "paid" } }).sort({ createdAt: -1 }).limit(5),
      Claim.find({ status: { $in: ["pending", "Submitted", "Under Review"] } })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.json({
      leads,
      customers,
      policies,
      premiums,
      claims,
      users,
      duePremiums,
      pendingClaims,
    });
  } catch (error) {
    console.error("AI summary error:", error);
    res.status(500).json({ message: "AI summary failed" });
  }
});

router.get("/recommendations", auth(), async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const [hotLeads, premiumAlerts, policyRenewals, claimAlerts] =
      await Promise.all([
        Lead.find()
          .sort({ createdAt: -1 })
          .limit(5),

        Premium.find({ status: { $ne: "paid" } })
          .sort({ dueDate: 1, createdAt: -1 })
          .limit(5),

        Policy.find({
          $or: [
            { expiryDate: { $gte: today, $lte: next7Days } },
            { renewalDate: { $gte: today, $lte: next7Days } },
          ],
        })
          .sort({ expiryDate: 1, renewalDate: 1 })
          .limit(5),

        Claim.find({
          status: { $in: ["pending", "Submitted", "Under Review"] },
        })
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    const recommendations = [];

    if (hotLeads.length > 0) {
      recommendations.push({
        type: "HOT_LEADS",
        title: "Call hot leads first",
        message: `You have ${hotLeads.length} recent leads. Start follow-up today to improve conversion.`,
        priority: "high",
      });
    }

    if (premiumAlerts.length > 0) {
      recommendations.push({
        type: "PREMIUM_DUE",
        title: "Premium payment follow-up",
        message: `${premiumAlerts.length} premium records are pending. Send payment reminders today.`,
        priority: "high",
      });
    }

    if (policyRenewals.length > 0) {
      recommendations.push({
        type: "POLICY_RENEWAL",
        title: "Policy renewal alert",
        message: `${policyRenewals.length} policies are near renewal or expiry in the next 7 days.`,
        priority: "medium",
      });
    }

    if (claimAlerts.length > 0) {
      recommendations.push({
        type: "CLAIM_ALERT",
        title: "Pending claim review",
        message: `${claimAlerts.length} claims need review. Update claim status quickly.`,
        priority: "high",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "NORMAL",
        title: "CRM is healthy",
        message: "No urgent follow-ups found today. Focus on new leads and customer retention.",
        priority: "low",
      });
    }

    res.json({
      recommendations,
      hotLeads,
      premiumAlerts,
      policyRenewals,
      claimAlerts,
    });
  } catch (error) {
    console.error("AI recommendations error:", error);
    res.status(500).json({ message: "AI recommendations failed" });
  }
});

router.post("/ask", auth(), async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const [
      totalLeads,
      totalCustomers,
      activePolicies,
      pendingPremiums,
      pendingClaims,
      agents,
    ] = await Promise.all([
      Lead.countDocuments(),
      Customer.countDocuments(),
      Policy.countDocuments({ status: "active" }),
      Premium.countDocuments({ status: { $ne: "paid" } }),
      Claim.countDocuments({
        status: { $in: ["pending", "Submitted", "Under Review"] },
      }),
      User.countDocuments({ role: "agent" }),
    ]);

    const q = question.toLowerCase();
    let answer = "";

    if (q.includes("premium")) {
      answer = `You have ${pendingPremiums} pending premium records. Priority: contact customers with due premiums first and send payment reminders.`;
    } else if (q.includes("claim")) {
      answer = `You have ${pendingClaims} pending claims. Priority: review claim documents and update claim status quickly.`;
    } else if (q.includes("lead")) {
      answer = `You have ${totalLeads} leads. Focus on follow-up leads and convert high-income customers first.`;
    } else if (q.includes("customer")) {
      answer = `You have ${totalCustomers} customers. Improve retention by sending renewal, KYC and premium reminders.`;
    } else if (q.includes("agent")) {
      answer = `You have ${agents} agents. Track agent performance using leads, policies and premium collection.`;
    } else {
      answer = `CRM Summary: ${totalLeads} leads, ${totalCustomers} customers, ${activePolicies} active policies, ${pendingPremiums} pending premiums, and ${pendingClaims} pending claims. Recommended action: follow up pending premiums and high-value leads today.`;
    }

    res.json({ answer });
  } catch (error) {
    console.error("AI ask error:", error);
    res.status(500).json({ message: "AI assistant failed" });
  }
});

module.exports = router;