const express = require("express");
const router = express.Router();

const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const Employee = require("../models/Employee");
const Commission = require("../models/Commission");
const auth = require("../middleware/auth");

router.get("/", auth(), async (req, res) => {
  try {
    const [
      totalCustomers,
      totalPolicies,
      totalPremiums,
      totalClaims,
      totalEmployees,
      totalCommissions,
      paidPremiums,
      duePremiums,
      activePolicies,
      pendingClaims,
      paidCommissions,
      pendingCommissions,
    ] = await Promise.all([
      Customer.countDocuments(),
      Policy.countDocuments(),
      Premium.countDocuments(),
      Claim.countDocuments(),
      Employee.countDocuments(),
      Commission.countDocuments(),

      Premium.aggregate([
        { $match: { status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      Premium.aggregate([
        { $match: { status: { $in: ["Due", "Overdue"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      Policy.countDocuments({ status: "active" }),
      Claim.countDocuments({ status: "Under Review" }),

      Commission.aggregate([
        { $match: { status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
      ]),

      Commission.aggregate([
        { $match: { status: "Pending" } },
        { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
      ]),
    ]);

    const premiumByStatus = await Premium.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const claimsByStatus = await Claim.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$claimAmount" },
        },
      },
    ]);

    const policiesByStatus = await Policy.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const commissionByRole = await Commission.aggregate([
      {
        $group: {
          _id: "$employeeRole",
          total: { $sum: "$commissionAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const premiumByMonth = await Premium.aggregate([
      {
        $group: {
          _id: { $substr: ["$dueDate", 0, 7] },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      cards: {
        totalCustomers,
        totalPolicies,
        totalPremiums,
        totalClaims,
        totalEmployees,
        totalCommissions,
        paidPremiumAmount: paidPremiums[0]?.total || 0,
        duePremiumAmount: duePremiums[0]?.total || 0,
        activePolicies,
        pendingClaims,
        paidCommissionAmount: paidCommissions[0]?.total || 0,
        pendingCommissionAmount: pendingCommissions[0]?.total || 0,
      },
      premiumByStatus,
      claimsByStatus,
      policiesByStatus,
      commissionByRole,
      premiumByMonth,
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ message: "Reports fetch failed" });
  }
});

module.exports = router;