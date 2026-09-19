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

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const isPositiveNumber = (value) => {
  const number = toFiniteNumber(value);
  return number !== null && number > 0;
};

const isValidAge = (value) => {
  const number = toFiniteNumber(value);
  return number !== null && number >= 0 && number <= 120;
};

const customerPlanFields =
  "_id planName category planType coverageAmount yearlyPremium yearlyAmount paymentYears ageMin ageMax eligibleFrom eligibleTo benefits coverage description premiumMode status";

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

    if (!category || coverageAmount === undefined || age === undefined) {
      return res.status(400).json({
        message: "Category, coverage amount and age required",
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    if (!isPositiveNumber(coverageAmount)) {
      return res.status(400).json({ message: "Coverage amount must be a positive number" });
    }

    if (!isValidAge(age) || Number(age) <= 0) {
      return res.status(400).json({ message: "Age must be between 1 and 120" });
    }

    if (
      paymentYears !== undefined &&
      paymentYears !== "" &&
      !isPositiveNumber(paymentYears)
    ) {
      return res.status(400).json({ message: "Payment years must be a positive number" });
    }

    const yearlyPremium = calculatePremium({
      category,
      coverageAmount: Number(coverageAmount),
      age: Number(age),
      paymentYears: paymentYears === undefined || paymentYears === ""
        ? 1
        : Number(paymentYears),
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

    if (!isPositiveNumber(coverageAmount)) {
      return res.status(400).json({ message: "Coverage amount must be a positive number" });
    }

    if (
      paymentYears !== undefined &&
      paymentYears !== "" &&
      !isPositiveNumber(paymentYears)
    ) {
      return res.status(400).json({ message: "Payment years must be a positive number" });
    }

    if (ageMin !== undefined && ageMin !== "" && !isValidAge(ageMin)) {
      return res.status(400).json({ message: "Minimum age must be between 0 and 120" });
    }

    if (ageMax !== undefined && ageMax !== "" && !isValidAge(ageMax)) {
      return res.status(400).json({ message: "Maximum age must be between 0 and 120" });
    }

    const finalAgeMin = ageMin === undefined || ageMin === "" ? 0 : Number(ageMin);
    const finalAgeMax = ageMax === undefined || ageMax === "" ? 100 : Number(ageMax);

    if (finalAgeMin > finalAgeMax) {
      return res.status(400).json({ message: "Minimum age cannot exceed maximum age" });
    }

    if (premiumMode && !["auto", "manual"].includes(premiumMode)) {
      return res.status(400).json({ message: "Invalid premium mode" });
    }

    if (
      status &&
      !["Pending", "Approved", "Rejected", "Active", "Inactive"].includes(status)
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const effectivePremiumMode = premiumMode || "auto";

    if (
      effectivePremiumMode === "manual" &&
      !isPositiveNumber(yearlyPremium || yearlyAmount)
    ) {
      return res.status(400).json({ message: "Yearly premium must be a positive number" });
    }

    let finalPremium = Number(yearlyPremium || yearlyAmount || 0);

    if (effectivePremiumMode === "auto") {
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
      ageMin: finalAgeMin,
      ageMax: finalAgeMax,
      eligibleFrom: eligibleFrom || "",
      eligibleTo: eligibleTo || "",
      benefits: Array.isArray(benefits) ? benefits : [],
      coverage: coverage || "",
      description: description || "",
      premiumMode: effectivePremiumMode,
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
    })
      .select(customerPlanFields)
      .sort({ createdAt: -1 })
      .lean();

    res.json(plans);
  } catch (error) {
    console.error("Plans fetch error:", error);
    res.status(500).json({ message: "Plans fetch failed" });
  }
});
/* ================= SEED DEFAULT PLANS ================= */

router.post("/seed-default", auth(["admin"]), async (req, res) => {
  try {
    const defaultPlans = [
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
    ];

    await InsurancePlan.bulkWrite(
      defaultPlans.map((plan) => ({
        updateOne: {
          filter: { planName: plan.planName },
          update: {
            $setOnInsert: {
              ...plan,
              createdBy: req.user.id,
            },
          },
          upsert: true,
        },
      }))
    );

    const plans = await InsurancePlan.find({
      planName: { $in: defaultPlans.map((plan) => plan.planName) },
    }).sort({ planName: 1 });

    res.json({
      message: "Default Plans Seeded Successfully",
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
    const isAdmin = req.user.role === "admin";

    const query = {
      _id: req.params.id,
      ...(isAdmin ? {} : { status: { $in: ["Approved", "Active"] } }),
    };

    const planQuery = InsurancePlan.findOne(query);

    if (!isAdmin) {
      planQuery.select(customerPlanFields);
    }

    const plan = await planQuery.lean();

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

    if (
      coverageAmount !== undefined &&
      coverageAmount !== "" &&
      !isPositiveNumber(coverageAmount)
    ) {
      return res.status(400).json({ message: "Coverage amount must be a positive number" });
    }

    if (
      paymentYears !== undefined &&
      paymentYears !== "" &&
      !isPositiveNumber(paymentYears)
    ) {
      return res.status(400).json({ message: "Payment years must be a positive number" });
    }

    if (ageMin !== undefined && ageMin !== "" && !isValidAge(ageMin)) {
      return res.status(400).json({ message: "Minimum age must be between 0 and 120" });
    }

    if (ageMax !== undefined && ageMax !== "" && !isValidAge(ageMax)) {
      return res.status(400).json({ message: "Maximum age must be between 0 and 120" });
    }

    const finalAgeMin =
      ageMin === undefined || ageMin === "" ? Number(plan.ageMin || 0) : Number(ageMin);
    const finalAgeMax =
      ageMax === undefined || ageMax === "" ? Number(plan.ageMax ?? 100) : Number(ageMax);

    if (finalAgeMin > finalAgeMax) {
      return res.status(400).json({ message: "Minimum age cannot exceed maximum age" });
    }

    if (premiumMode && !["auto", "manual"].includes(premiumMode)) {
      return res.status(400).json({ message: "Invalid premium mode" });
    }

    if (
      status &&
      !["Pending", "Approved", "Rejected", "Active", "Inactive"].includes(status)
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const effectivePremiumMode = premiumMode || plan.premiumMode || "auto";

    if (
      effectivePremiumMode === "manual" &&
      (yearlyPremium !== undefined || yearlyAmount !== undefined) &&
      !isPositiveNumber(yearlyPremium || yearlyAmount)
    ) {
      return res.status(400).json({ message: "Yearly premium must be a positive number" });
    }

    let finalPremium = Number(yearlyPremium || yearlyAmount || plan.yearlyPremium || 0);

    if (effectivePremiumMode === "auto") {
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
    plan.ageMin = finalAgeMin;
    plan.ageMax = finalAgeMax;
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
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      query.category = category;
    }

    if (search) {
      const escapedSearch = String(search)
        .trim()
        .slice(0, 100)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (escapedSearch) {
        query.$or = [
          { planName: { $regex: escapedSearch, $options: "i" } },
          { planType: { $regex: escapedSearch, $options: "i" } },
          { description: { $regex: escapedSearch, $options: "i" } },
        ];
      }
    }

    const minPremiumNumber =
      minPremium === undefined || minPremium === ""
        ? null
        : toFiniteNumber(minPremium);
    const maxPremiumNumber =
      maxPremium === undefined || maxPremium === ""
        ? null
        : toFiniteNumber(maxPremium);

    if (
      (minPremiumNumber !== null && minPremiumNumber < 0) ||
      (maxPremiumNumber !== null && maxPremiumNumber < 0) ||
      (minPremium !== undefined && minPremium !== "" && minPremiumNumber === null) ||
      (maxPremium !== undefined && maxPremium !== "" && maxPremiumNumber === null)
    ) {
      return res.status(400).json({ message: "Premium filters must be valid non-negative numbers" });
    }

    if (
      minPremiumNumber !== null &&
      maxPremiumNumber !== null &&
      minPremiumNumber > maxPremiumNumber
    ) {
      return res.status(400).json({ message: "Minimum premium cannot exceed maximum premium" });
    }

    if (minPremiumNumber !== null || maxPremiumNumber !== null) {
      query.yearlyPremium = {};
      if (minPremiumNumber !== null) query.yearlyPremium.$gte = minPremiumNumber;
      if (maxPremiumNumber !== null) query.yearlyPremium.$lte = maxPremiumNumber;
    }

    const plans = await InsurancePlan.find(query)
      .select(customerPlanFields)
      .sort({ yearlyPremium: 1 })
      .lean();

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

    const ageNumber =
      age === undefined || age === "" ? null : toFiniteNumber(age);
    const incomeNumber =
      income === undefined || income === "" ? null : toFiniteNumber(income);
    const familyMembersNumber =
      familyMembers === undefined || familyMembers === ""
        ? null
        : toFiniteNumber(familyMembers);
    const budgetNumber =
      budget === undefined || budget === "" ? null : toFiniteNumber(budget);

    if (ageNumber !== null && (ageNumber < 1 || ageNumber > 120)) {
      return res.status(400).json({ message: "Age must be between 1 and 120" });
    }

    if (
      (age !== undefined && age !== "" && ageNumber === null) ||
      (income !== undefined && income !== "" && (incomeNumber === null || incomeNumber < 0)) ||
      (familyMembers !== undefined &&
        familyMembers !== "" &&
        (familyMembersNumber === null ||
          familyMembersNumber < 0 ||
          !Number.isInteger(familyMembersNumber))) ||
      (budget !== undefined && budget !== "" && (budgetNumber === null || budgetNumber < 0))
    ) {
      return res.status(400).json({
        message: "Age, income, family members and budget must contain valid numbers",
      });
    }

    const safeGoal = typeof goal === "string" ? goal.slice(0, 500) : "";
    const safeHealthIssue =
      typeof healthIssue === "string" ? healthIssue.slice(0, 500) : "";

    let category = "Life Insurance";

    const text = `${safeGoal} ${safeHealthIssue}`.toLowerCase();

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

    if (budgetNumber !== null) {
      query.yearlyPremium = { $lte: budgetNumber };
    }

    let plans = await InsurancePlan.find(query)
      .select(customerPlanFields)
      .sort({ yearlyPremium: 1 });

    if (plans.length === 0) {
      plans = await InsurancePlan.find({
        status: { $in: ["Approved", "Active"] },
      })
        .select(customerPlanFields)
        .sort({ yearlyPremium: 1 });
    }

    const recommendations = plans.slice(0, 5).map((plan) => {
      let score = 60;

      if (
        ageNumber !== null &&
        ageNumber >= plan.ageMin &&
        ageNumber <= plan.ageMax
      ) {
        score += 15;
      }
      if (budgetNumber !== null && plan.yearlyPremium <= budgetNumber) score += 15;
      if (incomeNumber !== null && incomeNumber > 300000) score += 5;
      if (familyMembersNumber !== null && familyMembersNumber > 2) score += 5;

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