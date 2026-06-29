const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const User = require("../models/User");
const AIFollowup = require("../models/AIFollowup");

const allowedRoles = ["admin", "bm"];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getUserCreatedByQuery = (userId) => ({
  $or: [{ createdBy: userId }, { createdBy: String(userId) }],
});

router.get("/test", (req, res) => {
  res.json({
    message: "CEO Dashboard Route Working",
  });
});

router.get("/overview", auth(allowedRoles), async (req, res) => {
  try {
    const [
      totalLeads,
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalClaims,
      pendingClaims,
      totalUsers,
      pendingFollowups,
      premiumAgg,
    ] = await Promise.all([
      Lead.countDocuments(),
      Customer.countDocuments(),
      Policy.countDocuments(),
      Policy.countDocuments({
        status: { $in: ["active", "Active", "ACTIVE"] },
      }),
      Claim.countDocuments(),
      Claim.countDocuments({
        status: {
          $in: ["pending", "Pending", "Submitted", "Under Review"],
        },
      }),
      User.countDocuments(),
      AIFollowup.countDocuments({ status: "Pending" }),
      Premium.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$amount" } },
          },
        },
      ]),
    ]);

    const totalRevenue = premiumAgg[0]?.total || 0;
    const conversionRate =
      totalLeads > 0 ? Math.round((totalPolicies / totalLeads) * 100) : 0;

    res.json({
      totalRevenue,
      totalLeads,
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalClaims,
      pendingClaims,
      totalUsers,
      pendingFollowups,
      conversionRate,
    });
  } catch (error) {
    console.error("CEO overview error:", error);
    res.status(500).json({ message: "CEO overview failed" });
  }
});

router.get("/charts", auth(allowedRoles), async (req, res) => {
  try {
    const revenueByMonth = await Premium.aggregate([
      {
        $match: {
          createdAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: { $toDouble: "$amount" } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const policiesByStatus = await Policy.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const claimsByStatus = await Claim.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$role", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthNames = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    res.json({
      revenueByMonth: revenueByMonth.map((item) => ({
        month: `${monthNames[item._id.month]} ${item._id.year}`,
        total: item.total || 0,
      })),
      policiesByStatus: policiesByStatus.map((item) => ({
        status: item._id || "Unknown",
        count: item.count || 0,
      })),
      claimsByStatus: claimsByStatus.map((item) => ({
        status: item._id || "Unknown",
        count: item.count || 0,
      })),
      usersByRole: usersByRole.map((item) => ({
        role: item._id || "Unknown",
        count: item.count || 0,
      })),
    });
  } catch (error) {
    console.error("CEO charts error:", error);
    res.status(500).json({ message: "CEO charts failed" });
  }
});

router.get("/leaderboard", auth(allowedRoles), async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["agent", "agency_manager", "unit_manager", "bm"] },
      status: { $ne: "blocked" },
    })
      .select("name email role branch")
      .limit(20);

    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();

        const [leads, policies, premiums] = await Promise.all([
          Lead.countDocuments(getUserCreatedByQuery(userId)),
          Policy.countDocuments(getUserCreatedByQuery(userId)),
          Premium.aggregate([
            {
              $match: getUserCreatedByQuery(userId),
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $toDouble: "$amount" } },
              },
            },
          ]),
        ]);

        const revenue = premiums[0]?.total || 0;
        const score = leads + policies * 5 + Math.round(revenue / 10000);

        return {
          userId: user._id,
          name: user.name || "Unknown",
          email: user.email || "",
          role: user.role || "",
          branch: user.branch || "",
          leads,
          policies,
          revenue,
          score,
        };
      })
    );

    leaderboard.sort((a, b) => b.score - a.score);

    res.json(leaderboard.slice(0, 10));
  } catch (error) {
    console.error("CEO leaderboard error:", error);
    res.status(500).json({ message: "CEO leaderboard failed" });
  }
});

router.get("/activities", auth(allowedRoles), async (req, res) => {
  try {
    const [leads, policies, claims, followups] = await Promise.all([
      Lead.find().sort({ createdAt: -1 }).limit(5),
      Policy.find().sort({ createdAt: -1 }).limit(5),
      Claim.find().sort({ createdAt: -1 }).limit(5),
      AIFollowup.find().sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      leads,
      policies,
      claims,
      followups,
    });
  } catch (error) {
    console.error("CEO activities error:", error);
    res.status(500).json({ message: "CEO activities failed" });
  }
});

module.exports = router;