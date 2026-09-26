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
  "_id planName category planType productGroup coverageAmount yearlyPremium yearlyAmount firstYearPremium subsequentYearPremium paymentYears policyTermYears premiumFrequencies maturityAges premiumPayingTerms pptPremiumFactors pricingRules benefitRules loanRules surrenderRules revivalRules freeLookRules ageMin ageMax eligibleFrom eligibleTo benefits coverage description premiumMode status";

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

/* ================= SMART PLAN QUOTATION ================= */

router.post("/:id/quote", auth(), async (req, res) => {
  try {
    const plan = await InsurancePlan.findOne({ _id: req.params.id, status: { $in: ["Approved", "Active"] } }).lean();
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const age = Number(req.body.age);
    const gender = String(req.body.gender || "Male");
    const smoker = Boolean(req.body.smoker);
    const frequency = String(req.body.frequency || "Yearly");
    const coverTillAge = Number(req.body.coverTillAge || 0);
    const requestedPpt = Number(req.body.paymentYears || 0);
    const customerAnnualPremium = Number(req.body.annualPremium || 0);
    const isGlodFlexible = plan.planName === "Glod 1 32";
    const cover = isGlodFlexible && customerAnnualPremium >= 30000
      ? Math.round(customerAnnualPremium * 10.39)
      : Number(req.body.coverageAmount || plan.coverageAmount || 0);
    if (isGlodFlexible && (!Number.isFinite(customerAnnualPremium) || customerAnnualPremium < 30000)) return res.status(400).json({ message: "Glod 1 32 annual premium starts from ₹30,000" });
    if (!Number.isFinite(age) || age < Number(plan.ageMin || 0) || age > Number(plan.ageMax ?? 100)) return res.status(400).json({ message: "Age is not eligible for this plan" });
    if (!Number.isFinite(cover) || cover <= 0) return res.status(400).json({ message: "Valid coverage amount required" });
    const allowed = Array.isArray(plan.premiumFrequencies) && plan.premiumFrequencies.length ? plan.premiumFrequencies : ["Yearly"];
    if (!allowed.includes(frequency)) return res.status(400).json({ message: "Premium frequency is not available for this plan" });

    const baseCover = Number(plan.coverageAmount || cover);
    const basePremium = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
    const rules = plan.pricingRules || {};
    const baseAge = Number(rules.baseAge || 25);
    const ageRate = Math.max(0, Number(rules.ageRatePercent || 0)) / 100;
    const smokerLoading = Math.max(0, Number(rules.smokerLoadingPercent || 0)) / 100;
    const femaleDiscount = Math.max(0, Number(rules.femaleDiscountPercent || 0)) / 100;
    const maturityAges = Array.isArray(plan.maturityAges) ? plan.maturityAges.map(Number).filter(x=>x>age) : [];
    const selectedMaturityAge = coverTillAge || (maturityAges.length ? maturityAges[0] : age + Number(plan.policyTermYears || plan.paymentYears || 1));
    if (maturityAges.length && !maturityAges.includes(selectedMaturityAge)) return res.status(400).json({ message: "Selected cover till age is not available for this plan" });
    const policyTermYears = selectedMaturityAge - age;
    if (!Number.isFinite(policyTermYears) || policyTermYears < 1) return res.status(400).json({ message: "Policy term is not valid for the selected age" });
    const allowedPpts = Array.isArray(plan.premiumPayingTerms) && plan.premiumPayingTerms.length ? plan.premiumPayingTerms.map(Number) : [Number(plan.paymentYears || 1)];
    const paymentYears = requestedPpt || allowedPpts[0];
    if (!allowedPpts.includes(paymentYears) || paymentYears > policyTermYears) return res.status(400).json({ message: "Selected premium paying term is not available for this policy term" });
    const agePremiums = rules.agePremiums || {};
    const agePremiumValue = Number(agePremiums[String(age)] ?? agePremiums.get?.(String(age)) ?? 0);
    const hasAgePremium = Number.isFinite(agePremiumValue) && agePremiumValue > 0;
    let annual = isGlodFlexible
      ? customerAnnualPremium
      : hasAgePremium
        ? agePremiumValue * (baseCover > 0 ? cover / baseCover : 1)
        : basePremium * (baseCover > 0 ? cover / baseCover : 1);
    if (!hasAgePremium && plan.premiumMode === "auto") annual *= 1 + Math.max(0, age - baseAge) * ageRate;
    const premiumAdditionPercent = Math.max(0, Number(rules.premiumAdditionPercent || 0)) / 100;
    annual *= 1 + premiumAdditionPercent;
    const pptFactors = plan.pptPremiumFactors || {};
    const pptFactor = Number(pptFactors[String(paymentYears)] ?? pptFactors.get?.(String(paymentYears)) ?? 1);
    if (Number.isFinite(pptFactor) && pptFactor > 0) annual *= pptFactor;
    if (smoker) annual *= 1 + smokerLoading;
    if (gender.toLowerCase() === "female") annual *= 1 - Math.min(femaleDiscount, 0.5);
    annual = Math.max(1, Math.round(annual));
    const divisors = { Yearly: 1, "Half-Yearly": 2, Quarterly: 4, Monthly: 12 };
    const instalmentPremium = Math.round(annual / (divisors[frequency] || 1));
    const schedule = Array.from({ length: paymentYears }, (_, i) => ({ policyYear: i + 1, annualPremium: annual, frequency, instalmentPremium }));
    const benefitRules = plan.benefitRules || {};
    const benefitType = String(benefitRules.benefitType || "Life Cover");
    const payoutStartYear = Math.max(0, Number(benefitRules.payoutStartYear || 0));
    const payoutYears = Math.max(0, Number(benefitRules.payoutYears || 0));
    const configuredAnnualPayout = Math.max(0, Number(benefitRules.annualPayout || 0));
    const guaranteedIncome = isGlodFlexible ? Math.round(annual * 0.1242) : configuredAnnualPayout;
    const immediateIncome = isGlodFlexible ? Math.round(annual * 0.30) : 0;
    const annualPayout = isGlodFlexible ? guaranteedIncome : configuredAnnualPayout;
    const benefitSchedule = payoutYears && annualPayout ? Array.from({length:payoutYears},(_,i)=>({policyYear:payoutStartYear+i,amount:annualPayout,type:benefitType})) : [];
    const configuredMaturityAmount = Math.max(0, Number(benefitRules.maturityAmount || 0));
    const returnOfPremium = String(benefitType).toLowerCase() === "return of premium";
    const totalPremium = annual * paymentYears;
    const maturityAmount = returnOfPremium ? totalPremium : (isGlodFlexible ? Math.round(annual * 10) : configuredMaturityAmount);
    const deathBenefit = isGlodFlexible ? Math.round(annual * 10.39) : Math.max(0, Number(benefitRules.deathBenefit || cover));

    res.json({ planId: plan._id, planName: plan.planName, productGroup: plan.productGroup || "Other", age, gender, smoker, coverageAmount: cover, coverTillAge:selectedMaturityAge, paymentYears, policyTermYears, frequency, instalmentsPerYear: divisors[frequency] || 1, instalmentPremium, annualPremium: annual, totalPremium, schedule, benefitType, benefitSchedule, maturityAmount, deathBenefit, guaranteedIncome, immediateIncome, benefits: plan.benefits || [], disclaimer: "Indicative quotation based on admin-approved plan rules. Final premium and benefits are subject to proposal review, underwriting and policy terms." });
  } catch (error) {
    console.error("Smart quote error:", error);
    res.status(500).json({ message: "Quotation calculation failed" });
  }
});

/* ================= CREATE PLAN - ADMIN ================= */

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const {
      planName,
      category,
      planType,
      productGroup,
      policyTermYears,
      premiumFrequencies,
      firstYearPremium,
      subsequentYearPremium,
      pricingRules,
      benefitRules,
      loanRules,
      surrenderRules,
      revivalRules,
      freeLookRules,
      maturityAges,
      premiumPayingTerms,
      pptPremiumFactors,
      coverageAmount,
      yearlyPremium,
      yearlyAmount,
      paymentYears,
      advisorCommissionRate,
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
      productGroup: productGroup || "Other",
      policyTermYears: Number(policyTermYears || paymentYears || 1),
      premiumFrequencies: Array.isArray(premiumFrequencies) && premiumFrequencies.length ? premiumFrequencies : ["Yearly", "Half-Yearly", "Quarterly", "Monthly"],
      firstYearPremium: Number(firstYearPremium || finalPremium || 0),
      subsequentYearPremium: Number(subsequentYearPremium || finalPremium || 0),
      pricingRules: pricingRules || undefined,
      benefitRules: benefitRules || undefined,
      loanRules: loanRules || undefined,
      surrenderRules: surrenderRules || undefined,
      revivalRules: revivalRules || undefined,
      freeLookRules: freeLookRules || undefined,
      maturityAges: Array.isArray(maturityAges) ? maturityAges.map(Number).filter(Number.isFinite) : [],
      premiumPayingTerms: Array.isArray(premiumPayingTerms) ? premiumPayingTerms.map(Number).filter(x=>Number.isFinite(x)&&x>0) : [],
      pptPremiumFactors: pptPremiumFactors && typeof pptPremiumFactors === "object" ? pptPremiumFactors : {},
      coverageAmount: Number(coverageAmount || 0),
      yearlyPremium: finalPremium,
      yearlyAmount: finalPremium,
      paymentYears: Number(paymentYears || 1),
      advisorCommissionRate: Math.min(100, Math.max(0, Number(advisorCommissionRate || 0))),
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
        planName: "IPsmart Plus",
        category: "Life Insurance",
        planType: "Term Plan",
        productGroup: "Term / Health Products",
        coverageAmount: 3500000,
        yearlyPremium: 8160,
        yearlyAmount: 8160,
        firstYearPremium: 8160,
        subsequentYearPremium: 8160,
        paymentYears: 10,
        policyTermYears: 30,
        premiumFrequencies: ["Yearly", "Half-Yearly", "Quarterly", "Monthly"],
        premiumPayingTerms: [10],
        pptPremiumFactors: { "10": 1 },
        maturityAges: [],
        pricingRules: {
          baseAge: 18,
          ageRatePercent: 0,
          smokerLoadingPercent: 0,
          femaleDiscountPercent: 0,
          agePremiums: {
            "18": 8000, "19": 9000, "20": 10000, "21": 11000, "22": 12000,
            "23": 13000, "24": 14000, "25": 15000, "26": 16000, "27": 17000,
            "28": 17600, "29": 18000, "30": 19000, "31": 20000, "32": 21000,
            "33": 22000, "34": 23000, "35": 24000, "36": 25000, "37": 26000,
            "38": 26800, "39": 27000, "40": 28000, "41": 29000, "42": 30000,
            "43": 40000, "44": 41000, "45": 42000, "46": 43000, "47": 44000,
            "48": 46700, "49": 45000, "50": 46000
          },
          premiumAdditionPercent: 2,
        },
        benefitRules: {
          benefitType: "Life Cover",
          payoutStartYear: 0,
          payoutYears: 0,
          annualPayout: 0,
          maturityAmount: 0,
          deathBenefit: 500000,
        },
        freeLookRules: {
          enabled: true,
          days: 15,
        },
        ageMin: 18,
        ageMax: 50,
        eligibleFrom: "Age 18",
        eligibleTo: "Age 50",
        benefits: [
          "₹5,00,000 Life Cover",
          "30 Year Policy Term",
          "10 Year Premium Paying Term",
          "15 Day Free-Look Period",
        ],
        coverage: "₹5,00,000 Life Cover",
        description: "IPsmart Plus term plan with admin-provided age-wise annual premiums for ages 18 to 50. Customer quotation displays the final premium after the configured 2% addition.",
        premiumMode: "manual",
        status: "Approved",
      },

      {
        planName: "IPsmart Plus ROP",
        category: "Life Insurance",
        planType: "Term Plan",
        productGroup: "Term / Health Products",
        coverageAmount: 4000000,
        yearlyPremium: 14000,
        yearlyAmount: 14000,
        firstYearPremium: 14000,
        subsequentYearPremium: 14000,
        paymentYears: 10,
        policyTermYears: 40,
        premiumFrequencies: ["Yearly", "Half-Yearly", "Quarterly", "Monthly"],
        premiumPayingTerms: [10],
        pptPremiumFactors: { "10": 1 },
        maturityAges: [],
        pricingRules: {
          baseAge: 18, ageRatePercent: 0, smokerLoadingPercent: 0, femaleDiscountPercent: 0,
          agePremiums: {
            "18":14000,"19":15000,"20":16000,"21":17000,"22":18000,"23":19000,"24":20000,"25":21000,
            "26":22000,"27":23000,"28":23600,"29":24000,"30":25000,"31":26000,"32":27000,"33":28000,
            "34":29000,"35":30000,"36":31000,"37":32000,"38":32700,"39":33000,"40":34000,"41":35000,
            "42":36000,"43":47000,"44":48000,"45":49000,"46":50000,"47":51000,"48":51880,"49":52000,"50":53000
          },
          premiumAdditionPercent: 2
        },
        benefitRules: {
          benefitType: "Return of Premium",
          payoutStartYear: 40,
          payoutYears: 0,
          annualPayout: 0,
          maturityAmount: 0,
          deathBenefit: 4000000
        },
        freeLookRules: { enabled: true, days: 15 },
        ageMin: 18, ageMax: 50, eligibleFrom: "Age 18", eligibleTo: "Age 50",
        benefits: ["₹40,00,000 Life Cover","40 Year Policy Term","10 Year Premium Paying Term","Return of premiums paid at maturity","15 Day Free-Look Period"],
        coverage: "₹40,00,000 Life Cover",
        description: "IPsmart Plus ROP with admin-provided age-wise annual premium rates. Premiums are payable for 10 years. Maturity benefit is configured as return of premiums paid, subject to the plan terms shown to the customer.",
        premiumMode: "manual",
        status: "Approved"
      },

      {
        planName: "Glod 1 32",
        category: "Life Insurance",
        planType: "Traditional Plan",
        productGroup: "Traditional Products",
        coverageAmount: 311700,
        yearlyPremium: 30000,
        yearlyAmount: 30000,
        firstYearPremium: 30000,
        subsequentYearPremium: 30000,
        paymentYears: 10,
        policyTermYears: 10,
        premiumFrequencies: ["Yearly", "Half-Yearly", "Quarterly", "Monthly"],
        premiumPayingTerms: [10],
        pptPremiumFactors: { "10": 1 },
        maturityAges: [],
        pricingRules: {
          baseAge: 18,
          ageRatePercent: 0,
          smokerLoadingPercent: 0,
          femaleDiscountPercent: 0,
          premiumAdditionPercent: 0
        },
        benefitRules: {
          benefitType: "Guaranteed Income",
          payoutStartYear: 1,
          payoutYears: 10,
          annualPayout: 3726,
          maturityAmount: 300000,
          deathBenefit: 311700
        },
        freeLookRules: { enabled: true, days: 15 },
        ageMin: 18,
        ageMax: 50,
        eligibleFrom: "Age 18",
        eligibleTo: "Age 50",
        benefits: [
          "Immediate Income = 30% of selected annual premium",
          "Guaranteed income auto-calculated from selected annual premium",
          "Simple Bonus",
          "Maturity amount auto-calculated from selected annual premium",
          "Death sum assured auto-calculated from selected annual premium",
          "Save The Date feature",
          "Savings Wallet option",
          "Bonus-linked benefits are non-guaranteed and depend on declared bonuses",
          "15 Day Free-Look Period"
        ],
        coverage: "Flexible cover auto-calculated from annual premium starting at ₹30,000",
        description: "Flexible traditional savings example. Customer can choose any annual premium from ₹30,000 upward. At ₹50,000: immediate income ₹15,000; guaranteed income ₹6,210; death sum assured ₹5,19,500. These three benefits scale proportionally with the selected annual premium.",
        premiumMode: "manual",
        status: "Approved"
      },

      {
        planName: "Gift P1 32",
        category: "Life Insurance",
        planType: "Traditional Plan",
        productGroup: "Traditional Products",
        coverageAmount: 1080000,
        yearlyPremium: 100000,
        yearlyAmount: 100000,
        firstYearPremium: 100000,
        subsequentYearPremium: 100000,
        paymentYears: 10,
        policyTermYears: 15,
        premiumFrequencies: ["Yearly", "Half-Yearly", "Quarterly", "Monthly"],
        premiumPayingTerms: [10],
        pptPremiumFactors: { "10": 1 },
        maturityAges: [],
        pricingRules: { baseAge: 18, ageRatePercent: 0, smokerLoadingPercent: 0, femaleDiscountPercent: 0, premiumAdditionPercent: 0 },
        benefitRules: { benefitType: "Guaranteed Income", payoutStartYear: 11, payoutYears: 5, annualPayout: 246200, maturityAmount: 0, deathBenefit: 1080000 },
        freeLookRules: { enabled: true, days: 15 },
        ageMin: 18,
        ageMax: 50,
        eligibleFrom: "Age 18",
        eligibleTo: "Age 50",
        benefits: [
          "Level Guaranteed Income option",
          "Guaranteed Income start year selectable from policy year 5 to 15",
          "10 Year Premium Paying Term",
          "Death sum assured auto-calculated from selected annual premium",
          "Guaranteed income auto-calculated from selected annual premium and selected income start year",
          "MoneyBack Benefit 0%",
          "Low Cover Income Booster: No",
          "Save The Date: No",
          "15 Day Free-Look Period"
        ],
        coverage: "Flexible cover auto-calculated from annual premium",
        description: "Traditional guaranteed-income example. Customer selects annual premium and guaranteed-income start year. ₹1,00,000 annual premium with income starting in year 11 uses ₹2,46,200 annual guaranteed income as the configured app example.",
        premiumMode: "manual",
        status: "Approved"
      },

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
          update: ["IPsmart Plus", "IPsmart Plus ROP", "Glod 1 32", "Gift P1 32"].includes(plan.planName)
            ? { $set: { ...plan, createdBy: req.user.id } }
            : { $setOnInsert: { ...plan, createdBy: req.user.id } },
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
      productGroup,
      policyTermYears,
      premiumFrequencies,
      pricingRules,
      benefitRules,
      maturityAges,
      premiumPayingTerms,
      pptPremiumFactors,
      coverageAmount,
      yearlyPremium,
      yearlyAmount,
      firstYearPremium,
      subsequentYearPremium,
      paymentYears,
      advisorCommissionRate,
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
    plan.planType = planType ?? plan.planType;
    if (productGroup !== undefined) plan.productGroup = productGroup;
    if (policyTermYears !== undefined) {
      const term = Number(policyTermYears);
      if (!Number.isFinite(term) || term < 1) return res.status(400).json({ message: "Policy term must be a positive number" });
      plan.policyTermYears = term;
    }
    if (premiumFrequencies !== undefined) {
      const allowedFrequencies = ["Yearly", "Half-Yearly", "Quarterly", "Monthly"];
      if (!Array.isArray(premiumFrequencies) || !premiumFrequencies.length || premiumFrequencies.some((x) => !allowedFrequencies.includes(x))) return res.status(400).json({ message: "Invalid premium frequencies" });
      plan.premiumFrequencies = premiumFrequencies;
    }
    if (pricingRules !== undefined) plan.pricingRules = { ...plan.pricingRules?.toObject?.(), ...pricingRules };
    if (benefitRules !== undefined) plan.benefitRules = { ...plan.benefitRules?.toObject?.(), ...benefitRules };
    if (loanRules !== undefined) plan.loanRules = { ...plan.loanRules?.toObject?.(), ...loanRules };
    if (surrenderRules !== undefined) plan.surrenderRules = { ...plan.surrenderRules?.toObject?.(), ...surrenderRules };
    if (revivalRules !== undefined) plan.revivalRules = { ...plan.revivalRules?.toObject?.(), ...revivalRules };
    if (freeLookRules !== undefined) plan.freeLookRules = { ...plan.freeLookRules?.toObject?.(), ...freeLookRules };
    if (maturityAges !== undefined) plan.maturityAges = Array.isArray(maturityAges) ? maturityAges.map(Number).filter(Number.isFinite) : [];
    if (premiumPayingTerms !== undefined) plan.premiumPayingTerms = Array.isArray(premiumPayingTerms) ? premiumPayingTerms.map(Number).filter(x=>Number.isFinite(x)&&x>0) : [];
    if (pptPremiumFactors !== undefined && pptPremiumFactors && typeof pptPremiumFactors === "object") plan.pptPremiumFactors = pptPremiumFactors;
    plan.coverageAmount = Number(coverageAmount || plan.coverageAmount || 0);
    plan.yearlyPremium = finalPremium;
    plan.yearlyAmount = finalPremium;
    if (firstYearPremium !== undefined && firstYearPremium !== "") {
      const value = Number(firstYearPremium);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ message: "First year premium must be a positive number" });
      plan.firstYearPremium = value;
    } else if (!plan.firstYearPremium) plan.firstYearPremium = finalPremium;
    if (subsequentYearPremium !== undefined && subsequentYearPremium !== "") {
      const value = Number(subsequentYearPremium);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ message: "Subsequent year premium must be a positive number" });
      plan.subsequentYearPremium = value;
    } else if (!plan.subsequentYearPremium) plan.subsequentYearPremium = finalPremium;
    plan.paymentYears = Number(paymentYears || plan.paymentYears || 1);
    if (advisorCommissionRate !== undefined) {
      const rate = Number(advisorCommissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) return res.status(400).json({ message: "Advisor commission rate must be between 0 and 100" });
      plan.advisorCommissionRate = rate;
    }
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