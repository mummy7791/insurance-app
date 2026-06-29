const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");

router.get("/", (req, res) => {
  res.json({ message: "Customer Portal Route Working" });
});

router.get("/test", (req, res) => {
  res.json({ message: "Customer portal test working" });
});

router.get("/my-data", auth(), async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    let customer = null;

    if (userEmail) {
      customer = await Customer.findOne({
        email: userEmail.toLowerCase().trim(),
      });
    }

    if (!customer && userId) {
      customer = await Customer.findOne({
        $or: [
          { userId },
          { user: userId },
          { createdBy: userId },
          { createdBy: String(userId) },
        ],
      });
    }

    // IMPORTANT: 404 kakunda empty data return chesthundi
    if (!customer) {
      return res.json({
        customer: {
          _id: "",
          name: "No customer profile linked",
          email: userEmail || "",
          phone: "",
          address: "",
        },
        policies: [],
        premiums: [],
        claims: [],
        message:
          "Logged-in user is not linked to any customer profile. Add customer with same email/userId.",
      });
    }

    const customerId = customer._id.toString();

    const [policies, premiums, claims] = await Promise.all([
      Policy.find({
        $or: [
          { customerId },
          { customer: customerId },
          { customerId: customer._id },
          { customer: customer._id },
        ],
      }).sort({ createdAt: -1 }),

      Premium.find({
        $or: [
          { customerId },
          { customer: customerId },
          { customerId: customer._id },
          { customer: customer._id },
        ],
      }).sort({ createdAt: -1 }),

      Claim.find({
        $or: [
          { customerId },
          { customer: customerId },
          { customerId: customer._id },
          { customer: customer._id },
        ],
      }).sort({ createdAt: -1 }),
    ]);

    res.json({
      customer,
      policies,
      premiums,
      claims,
    });
  } catch (error) {
    console.error("Customer portal error:", error);
    res.status(500).json({ message: "Customer portal data failed" });
  }
});

router.post("/raise-claim", auth(), async (req, res) => {
  try {
    const { policyId, claimAmount, reason } = req.body;

    if (!policyId || !claimAmount || !reason) {
      return res.status(400).json({
        message: "Policy, claim amount and reason are required",
      });
    }

    const claim = await Claim.create({
      policyId,
      claimAmount: Number(claimAmount),
      reason,
      status: "Submitted",
      createdBy: req.user?.id,
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error("Customer raise claim error:", error);
    res.status(500).json({ message: "Claim raise failed" });
  }
});

module.exports = router;