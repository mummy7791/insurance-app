const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const InsurancePlan = require("../models/InsurancePlan");

/* ================= HELPERS ================= */

const validCategories = [
  "Life Insurance",
  "Health Insurance",
  "Medical Insurance",
  "Education Insurance",
  "Personal Accident Insurance",
  "Disability Insurance",
  "Cancer Insurance",
  "Maternity Insurance",
  "Travel Insurance",
  "Pension Retirement Plan",
];

const calculatePremium = ({
  category,
  coverageAmount,
  age,
  paymentYears,
}) => {
  let rate = 0.01;

  if (category === "Life Insurance") rate = 0.008;
  if (category === "Health Insurance") rate = 0.012;
  if (category === "Medical Insurance") rate = 0.013;
  if (category === "Education Insurance") rate = 0.0065;
  if (category === "Personal Accident Insurance") rate = 0.004;
  if (category === "Disability Insurance") rate = 0.007;
  if (category === "Cancer Insurance") rate = 0.009;
  if (category === "Maternity Insurance") rate = 0.011;
  if (category === "Travel Insurance") rate = 0.003;
  if (category === "Pension Retirement Plan") rate = 0.01;

  let ageFactor = 1;

  if (Number(age) > 35) ageFactor = 1.2;
  if (Number(age) > 45) ageFactor = 1.5;
  if (Number(age) > 60) ageFactor = 2;

  const premium =
    (Number(coverageAmount || 0) * rate * ageFactor) /
    Number(paymentYears || 1);

  return Math.round(premium);
};

/* ================= TEST ================= */

router.get("/test", (req, res) => {
  res.json({ message: "Insurance Plans Route Working" });
});

/* ================= PREMIUM CALCULATOR ================= */

router.post("/calculate-premium", (req, res) => {
  try {
    const { category, coverageAmount, age, paymentYears } = req.body;

    if (!category || !coverageAmount || !age) {
      return res.status(400).json({
        message: "Category, coverage amount and age required",
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const yearlyPremium = calculatePremium({
      category,
      coverageAmount,
      age,
      paymentYears: paymentYears || 1,
    });

    res.json({
      category,
      coverageAmount: Number(coverageAmount),
      age: Number(age),
      paymentYears: Number(paymentYears || 1),
      yearlyPremium,
    });
  } catch (error) {
    console.error("Premium calculate error:", error);
    res.status(500).json({ message: "Premium calculation failed" });
  }
});

/* ================= CREATE PLAN - ADMIN ================= */

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const {
      planName,
      category,
      planType,
      coverageAmount,
      yearlyPremium,
      yearlyAmount,
      paymentYears,
      ageMin,
      ageMax,
      eligibleFrom,
      eligibleTo,
      benefits,
      coverage,
      description,
      premiumMode,
      age,
      status,
    } = req.body;

    if (!planName || !category || !coverageAmount) {
      return res.status(400).json({
        message: "Plan name, category and coverage required",
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    let finalPremium = Number(yearlyPremium || yearlyAmount || 0);

    if (premiumMode === "auto") {
      finalPremium = calculatePremium({
        category,
        coverageAmount,
        age: age || ageMin || 25,
        paymentYears: paymentYears || 1,
      });
    }

    const plan = await InsurancePlan.create({
      planName,
      category,
      planType: planType || "",
      coverageAmount: Number(coverageAmount || 0),
      yearlyPremium: finalPremium,
      yearlyAmount: finalPremium,
      paymentYears: Number(paymentYears || 1),
      ageMin: Number(ageMin || 0),
      ageMax: Number(ageMax || 100),
      eligibleFrom: eligibleFrom || "",
      eligibleTo: eligibleTo || "",
      benefits: Array.isArray(benefits) ? benefits : [],
      coverage: coverage || "",
      description: description || "",
      premiumMode: premiumMode || "auto",
      status: status || "Approved",
      createdBy: req.user?.id || null,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Plan create error:", error);
    res.status(500).json({ message: "Plan create failed" });
  }
});

/* ================= CUSTOMER VISIBLE PLANS ================= */

router.get("/", auth(), async (req, res) => {
  try {
    const plans = await InsurancePlan.find({
      status: { $in: ["Approved", "Active"] },
    }).sort({ createdAt: -1 });

    res.json(plans);
  } catch (error) {
    console.error("Plans fetch error:", error);
    res.status(500).json({ message: "Plans fetch failed" });
  }
});
/* ================= SEED DEFAULT PLANS ================= */

router.post("/seed-default", auth(["admin"]), async (req, res) => {
  try {
    await InsurancePlan.deleteMany({});

    const plans = await InsurancePlan.insertMany([
      {
        planName: "Term Insurance",
        category: "Life Insurance",
        planType: "Term Plan",
        coverageAmount: 3000000,
        yearlyPremium: 2400,
        yearlyAmount: 2400,
        paymentYears: 1,
        ageMin: 18,
        ageMax: 60,
        benefits: [
          "₹30 Lakhs Life Cover",
          "Low Premium",
          "Family Protection",
          "Tax Benefits",
        ],
        coverage:
          "Death Benefit up to ₹30 Lakhs.",
        description:
          "Pure life protection plan.",
        premiumMode: "auto",
        status: "Approved",
      },

      {
        planName: "Whole Life Insurance",
        category: "Life Insurance",
        planType: "Whole Life",
        coverageAmount: 5000000,
        yearlyPremium: 6500,
        yearlyAmount: 6500,
        paymentYears: 20,
        ageMin: 18,
        ageMax: 65,
        benefits: [
          "Lifetime Cover",
          "Guaranteed Benefit",
        ],
        coverage: "Coverage till age 100",
        description:
          "Lifetime insurance protection.",
        premiumMode: "manual",
        status: "Approved",
      },

      {
        planName: "Family Floater",
        category: "Health Insurance",
        planType: "Family",
        coverageAmount: 500000,
        yearlyPremium: 6500,
        yearlyAmount: 6500,
        paymentYears: 1,
        ageMin: 18,
        ageMax: 65,
        benefits: [
          "Hospitalization",
          "Cashless Treatment",
          "ICU",
          "Medicines",
        ],
        coverage:
          "Entire Family Covered",
        status: "Approved",
      },

      {
        planName: "Critical Illness Plan",
        category: "Health Insurance",
        planType: "Critical",
        coverageAmount: 1000000,
        yearlyPremium: 7800,
        yearlyAmount: 7800,
        paymentYears: 1,
        benefits: [
          "Cancer",
          "Stroke",
          "Heart Attack",
          "Kidney Failure",
        ],
        coverage:
          "Critical illness lump sum.",
        status: "Approved",
      },

      {
        planName: "Medical Care Plus",
        category: "Medical Insurance",
        planType: "Medical",
        coverageAmount: 700000,
        yearlyPremium: 5200,
        yearlyAmount: 5200,
        paymentYears: 1,
        benefits: [
          "Hospital",
          "Doctor Fees",
          "Medicines",
          "Ambulance",
        ],
        coverage:
          "Complete Medical Cover",
        status: "Approved",
      },

      {
        planName: "Education Returns Plan",
        category: "Education Insurance",
        planType: "Child Education",
        coverageAmount: 200000,
        yearlyPremium: 1950,
        yearlyAmount: 1950,
        paymentYears: 4,
        eligibleFrom: "1st Class",
        eligibleTo: "B.Tech",
        ageMin: 5,
        ageMax: 25,
        benefits: [
          "School Fee Support",
          "College Fee",
          "Engineering Fee",
          "Parent Protection",
        ],
        coverage:
          "Education Benefit Plan",
        description:
          "₹1950 yearly for 4 years.",
        premiumMode: "manual",
        status: "Approved",
      },

      {
        planName: "Personal Accident Cover",
        category: "Personal Accident Insurance",
        planType: "Accident",
        coverageAmount: 1000000,
        yearlyPremium: 1200,
        yearlyAmount: 1200,
        paymentYears: 1,
        benefits: [
          "Accidental Death",
          "Permanent Disability",
          "Income Loss",
        ],
        coverage:
          "Accident Protection",
        status: "Approved",
      },

      {
        planName: "Cancer Shield",
        category: "Cancer Insurance",
        planType: "Cancer",
        coverageAmount: 1500000,
        yearlyPremium: 4800,
        yearlyAmount: 4800,
        paymentYears: 1,
        benefits: [
          "Early Stage",
          "Major Cancer",
          "Treatment",
        ],
        coverage:
          "Cancer Treatment Benefit",
        status: "Approved",
      },

      {
        planName: "Travel Protect",
        category: "Travel Insurance",
        planType: "Travel",
        coverageAmount: 1000000,
        yearlyPremium: 1800,
        yearlyAmount: 1800,
        paymentYears: 1,
        benefits: [
          "Flight Delay",
          "Lost Baggage",
          "Passport Loss",
        ],
        coverage:
          "Worldwide Travel Cover",
        status: "Approved",
      },

      {
        planName: "Retirement Pension",
        category: "Pension Retirement Plan",
        planType: "Deferred Pension",
        coverageAmount: 500000,
        yearlyPremium: 10000,
        yearlyAmount: 10000,
        paymentYears: 10,
        benefits: [
          "Monthly Pension",
          "Retirement Income",
        ],
        coverage:
          "Retirement Security",
        status: "Approved",
      },
    ]);

    res.json({
      message: "Default Plans Created Successfully",
      plans,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Seed Failed",
    });
  }
});

/* ================= ADMIN GET ALL ================= */

router.get("/admin/all", auth(["admin"]), async (req, res) => {
  try {
    const plans = await InsurancePlan.find().sort({
      createdAt: -1,
    });

    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Plans Fetch Failed",
    });
  }
});

/* ================= GET SINGLE PLAN ================= */

router.get("/:id", auth(), async (req, res) => {
  try {
    const plan = await InsurancePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        message: "Plan Not Found",
      });
    }

    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Plan Fetch Failed",
    });
  }
});
/* ================= UPDATE PLAN ================= */

router.put("/:id", auth(["admin"]), async (req, res) => {
  try {
    const {
      planName,
      category,
      planType,
      coverageAmount,
      yearlyPremium,
      yearlyAmount,
      paymentYears,
      ageMin,
      ageMax,
      eligibleFrom,
      eligibleTo,
      benefits,
      coverage,
      description,
      premiumMode,
      status,
      age,
    } = req.body;

    const plan = await InsurancePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    let finalPremium = Number(yearlyPremium || yearlyAmount || plan.yearlyPremium || 0);

    if ((premiumMode || plan.premiumMode) === "auto") {
      finalPremium = calculatePremium({
        category: category || plan.category,
        coverageAmount: coverageAmount || plan.coverageAmount,
        age: age || ageMin || plan.ageMin || 25,
        paymentYears: paymentYears || plan.paymentYears || 1,
      });
    }

    plan.planName = planName || plan.planName;
    plan.category = category || plan.category;
    plan.planType = planType || plan.planType;
    plan.coverageAmount = Number(coverageAmount || plan.coverageAmount || 0);
    plan.yearlyPremium = finalPremium;
    plan.yearlyAmount = finalPremium;
    plan.paymentYears = Number(paymentYears || plan.paymentYears || 1);
    plan.ageMin = Number(ageMin || plan.ageMin || 0);
    plan.ageMax = Number(ageMax || plan.ageMax || 100);
    plan.eligibleFrom = eligibleFrom || plan.eligibleFrom || "";
    plan.eligibleTo = eligibleTo || plan.eligibleTo || "";
    plan.benefits = Array.isArray(benefits) ? benefits : plan.benefits;
    plan.coverage = coverage || plan.coverage || "";
    plan.description = description || plan.description || "";
    plan.premiumMode = premiumMode || plan.premiumMode || "auto";
    plan.status = status || plan.status || "Pending";

    await plan.save();

    res.json(plan);
  } catch (error) {
    console.error("Plan update error:", error);
    res.status(500).json({ message: "Plan update failed" });
  }
});

/* ================= DELETE PLAN ================= */

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const plan = await InsurancePlan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Plan delete error:", error);
    res.status(500).json({ message: "Plan delete failed" });
  }
});

/* ================= APPROVE / REJECT PLAN ================= */

router.put("/:id/approval", auth(["admin"]), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected", "Pending", "Active", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const plan = await InsurancePlan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json(plan);
  } catch (error) {
    console.error("Plan approval error:", error);
    res.status(500).json({ message: "Plan approval failed" });
  }
});

/* ================= SEARCH + FILTER ================= */

router.get("/search/filter", auth(), async (req, res) => {
  try {
    const { search, category, minPremium, maxPremium } = req.query;

    const query = {
      status: { $in: ["Approved", "Active"] },
    };

    if (category && category !== "All") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { planName: { $regex: search, $options: "i" } },
        { planType: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (minPremium || maxPremium) {
      query.yearlyPremium = {};
      if (minPremium) query.yearlyPremium.$gte = Number(minPremium);
      if (maxPremium) query.yearlyPremium.$lte = Number(maxPremium);
    }

    const plans = await InsurancePlan.find(query).sort({ yearlyPremium: 1 });

    res.json(plans);
  } catch (error) {
    console.error("Plan search error:", error);
    res.status(500).json({ message: "Plan search failed" });
  }
});

/* ================= AI RECOMMENDATION ================= */

router.post("/ai-recommend", auth(), async (req, res) => {
  try {
    const { age, income, goal, familyMembers, healthIssue, budget } = req.body;

    let category = "Life Insurance";

    const text = `${goal || ""} ${healthIssue || ""}`.toLowerCase();

    if (text.includes("health") || text.includes("medical")) {
      category = "Health Insurance";
    }

    if (text.includes("education") || text.includes("child") || text.includes("school")) {
      category = "Education Insurance";
    }

    if (text.includes("cancer")) {
      category = "Cancer Insurance";
    }

    if (text.includes("travel")) {
      category = "Travel Insurance";
    }

    if (text.includes("retirement") || text.includes("pension")) {
      category = "Pension Retirement Plan";
    }

    const query = {
      status: { $in: ["Approved", "Active"] },
      category,
    };

    if (budget) {
      query.yearlyPremium = { $lte: Number(budget) };
    }

    let plans = await InsurancePlan.find(query).sort({ yearlyPremium: 1 });

    if (plans.length === 0) {
      plans = await InsurancePlan.find({
        status: { $in: ["Approved", "Active"] },
      }).sort({ yearlyPremium: 1 });
    }

    const recommendations = plans.slice(0, 5).map((plan) => {
      let score = 60;

      if (Number(age) >= plan.ageMin && Number(age) <= plan.ageMax) score += 15;
      if (budget && plan.yearlyPremium <= Number(budget)) score += 15;
      if (income && Number(income) > 300000) score += 5;
      if (familyMembers && Number(familyMembers) > 2) score += 5;

      return {
        ...plan.toObject(),
        aiScore: Math.min(score, 100),
        aiReason:
          score >= 85
            ? "Best match based on age, budget and goal."
            : score >= 70
            ? "Good match for customer needs."
            : "Basic match. Review before recommending.",
      };
    });

    res.json(recommendations);
  } catch (error) {
    console.error("AI recommend error:", error);
    res.status(500).json({ message: "AI recommendation failed" });
  }
});

module.exports = router;