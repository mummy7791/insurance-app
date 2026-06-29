const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const Customer = require("../models/Customer");
const Policy = require("../models/Policy");
const Premium = require("../models/Premium");
const Claim = require("../models/Claim");

router.get("/", auth(), async (req, res) => {
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

    if (!customer) {
      return res.json({
        customer: {
          _id: "",
          name: req.user?.name || "",
          email: req.user?.email || "",
          phone: "",
          address: "",
          kycStatus: "Pending",
        },
        policies: [],
        premiums: [],
        claims: [],
        activities: [],
      });
    }

    const [policies, premiums, claims] = await Promise.all([
      Policy.find({ customerId: customer._id }).sort({ createdAt: -1 }),
      Premium.find({ customerId: customer._id }).sort({ createdAt: -1 }),
      Claim.find({ customerId: customer._id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      customer,
      policies,
      premiums,
      claims,
      activities: [],
    });
  } catch (error) {
    console.error("Customer dashboard error:", error);
    res.status(500).json({ message: "Customer dashboard failed" });
  }
});

module.exports = router;