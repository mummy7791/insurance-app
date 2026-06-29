const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const User = require("../models/User");
const Lead = require("../models/Lead");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const AIFollowup = require("../models/AIFollowup");

const allowedRoles = ["admin", "bm", "unit_manager", "agency_manager"];

const clamp = (value) => {
  const number = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const getUserQuery = (user) => {
  const objectId = user._id;
  const stringId = user._id.toString();

  return {
    $or: [{ createdBy: objectId }, { createdBy: stringId }],
  };
};

const calculateScore = async (user) => {
  const userQuery = getUserQuery(user);

  const [
    leads,
    policies,
    paidPremiums,
    totalPremiums,
    completedFollowups,
    totalFollowups,
    closedClaims,
    totalClaims,
  ] = await Promise.all([
    Lead.countDocuments(userQuery),
    Policy.countDocuments(userQuery),
    Premium.countDocuments({
      ...userQuery,
      status: { $in: ["paid", "Paid", "PAID"] },
    }),
    Premium.countDocuments(userQuery),
    AIFollowup.countDocuments({
      createdBy: user._id,
      status: "Completed",
    }),
    AIFollowup.countDocuments({ createdBy: user._id }),
    Claim.countDocuments({
      ...userQuery,
      status: { $in: ["Approved", "Closed", "approved", "closed"] },
    }),
    Claim.countDocuments(userQuery),
  ]);

  const leadConversionScore = leads > 0 ? (policies / leads) * 100 : 0;
  const premiumScore =
    totalPremiums > 0 ? (paidPremiums / totalPremiums) * 100 : 0;
  const followupScore =
    totalFollowups > 0 ? (completedFollowups / totalFollowups) * 100 : 0;
  const claimScore = totalClaims > 0 ? (closedClaims / totalClaims) * 100 : 0;
  const attendanceScore = 100;

  const overallScore = clamp(
    leadConversionScore * 0.3 +
      premiumScore * 0.25 +
      followupScore * 0.2 +
      claimScore * 0.15 +
      attendanceScore * 0.1
  );

  return {
    userId: user._id,
    name: user.name || "Unknown User",
    email: user.email || "",
    role: user.role || "agent",
    branch: user.branch || "",
    scores: {
      leadConversion: clamp(leadConversionScore),
      premiumCollection: clamp(premiumScore),
      followups: clamp(followupScore),
      claims: clamp(claimScore),
      attendance: attendanceScore,
      overall: overallScore,
    },
    counts: {
      leads,
      policies,
      paidPremiums,
      totalPremiums,
      completedFollowups,
      totalFollowups,
      closedClaims,
      totalClaims,
    },
  };
};

const getPerformanceUsers = async () => {
  return User.find({
    role: { $in: ["agent", "agency_manager", "unit_manager", "bm"] },
    status: { $ne: "blocked" },
  }).select("name email role branch status");
};

router.get("/", auth(allowedRoles), async (req, res) => {
  try {
    const users = await getPerformanceUsers();

    const results = await Promise.all(
      users.map((user) => calculateScore(user))
    );

    results.sort((a, b) => b.scores.overall - a.scores.overall);

    res.json(results);
  } catch (error) {
    console.error("AI performance error:", error);
    res.status(500).json({ message: "AI performance failed" });
  }
});

router.get("/top", auth(allowedRoles), async (req, res) => {
  try {
    const users = await getPerformanceUsers();

    const results = await Promise.all(
      users.map((user) => calculateScore(user))
    );

    results.sort((a, b) => b.scores.overall - a.scores.overall);

    res.json(results.slice(0, 10));
  } catch (error) {
    console.error("AI top performance error:", error);
    res.status(500).json({ message: "AI top performance failed" });
  }
});

router.get("/:id", auth(allowedRoles), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email role branch status"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await calculateScore(user);

    res.json(result);
  } catch (error) {
    console.error("AI performance detail error:", error);
    res.status(500).json({ message: "AI performance detail failed" });
  }
});

module.exports = router;