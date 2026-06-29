const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const Commission = require("../models/Commission");
const User = require("../models/User");

router.get("/stats", auth(), async (req, res) => {
  try {
    const [
      totalLeads,
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalPremiums,
      paidPremiums,
      duePremiums,
      totalClaims,
      pendingClaims,
      totalCommissions,
    ] = await Promise.all([
      Lead.countDocuments(),
      Customer.countDocuments(),
      Policy.countDocuments(),
      Policy.countDocuments({ status: "active" }),
      Premium.countDocuments(),
      Premium.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Premium.aggregate([
        { $match: { status: { $ne: "paid" } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Claim.countDocuments(),
      Claim.countDocuments({ status: { $in: ["Submitted", "Under Review", "pending"] } }),
      Commission.aggregate([
        { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
      ]),
    ]);

    res.json({
      totalLeads,
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalPremiums,
      premiumCollected: paidPremiums[0]?.total || 0,
      pendingPremium: duePremiums[0]?.total || 0,
      totalClaims,
      pendingClaims,
      totalCommission: totalCommissions[0]?.total || 0,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Dashboard stats failed" });
  }
});

router.get("/charts", auth(), async (req, res) => {
  try {
    const premiumByMonth = await Premium.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const policyByStatus = await Policy.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const claimsByStatus = await Claim.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
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
      premiumByMonth: premiumByMonth.map((item) => ({
        month: `${monthNames[item._id.month]} ${item._id.year}`,
        total: item.total || 0,
        count: item.count || 0,
      })),
      policyByStatus: policyByStatus.map((item) => ({
        status: item._id || "Unknown",
        count: item.count,
      })),
      claimsByStatus: claimsByStatus.map((item) => ({
        status: item._id || "Unknown",
        count: item.count,
      })),
      usersByRole: usersByRole.map((item) => ({
        role: item._id || "Unknown",
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Dashboard charts error:", error);
    res.status(500).json({ message: "Dashboard charts failed" });
  }
});

module.exports = router;