const express = require("express");
const router = express.Router();

const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");
const Employee = require("../models/Employee");
const Commission = require("../models/Commission");
const PlanPurchase = require("../models/PlanPurchase");
const auth = require("../middleware/auth");

router.get("/", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
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

router.get("/business", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    const { from = "", to = "", plan = "", advisor = "", status = "" } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(String(from) + "T00:00:00.000Z");
      if (to) match.createdAt.$lte = new Date(String(to) + "T23:59:59.999Z");
    }
    if (plan) match.planName = { $regex: String(plan).trim(), $options: "i" };
    if (advisor) match.advisorCode = { $regex: String(advisor).trim(), $options: "i" };
    if (status) match.policyStatus = String(status);

    const purchases = await PlanPurchase.find(match)
      .select("customerId planName category coverageAmount yearlyPremium paymentYears policyTermYears premiumFrequency advisorId advisorCode proposal paymentStatus policyStatus policyNumber startDate endDate nextPremiumDate createdAt")
      .populate("customerId", "name email phone address")
      .populate("advisorId", "name advisorCode")
      .sort({ createdAt: -1 })
      .lean();

    const rows = purchases.map((item) => ({
      id: String(item._id),
      customerName: item.proposal?.customerName || item.customerId?.name || "",
      customerPhone: item.proposal?.customerPhone || item.customerId?.phone || "",
      customerEmail: item.proposal?.customerEmail || item.customerId?.email || "",
      address: item.proposal?.address || item.customerId?.address || "",
      policyNumber: item.policyNumber || "",
      planName: item.planName || "",
      category: item.category || "",
      coverageAmount: Number(item.coverageAmount || 0),
      yearlyPremium: Number(item.yearlyPremium || 0),
      paymentStatus: item.paymentStatus || "",
      policyStatus: item.policyStatus || "",
      advisorName: item.advisorId?.name || "",
      advisorCode: item.advisorCode || item.advisorId?.advisorCode || "",
      purchaseDate: item.createdAt,
      nextPremiumDate: item.nextPremiumDate,
      premiumFrequency: item.premiumFrequency || "Yearly",
      paymentYears: Number(item.paymentYears || 0),
      policyTermYears: Number(item.policyTermYears || 0),
    }));

    res.json({ rows, total: rows.length });
  } catch (error) {
    console.error("Business report error:", error);
    res.status(500).json({ message: "Business report fetch failed" });
  }
});

module.exports = router;