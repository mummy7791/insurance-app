const router = require("express").Router();
const Claim = require("../models/Claim");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

router.post("/", auth(), async (req, res) => {
  try {
    const policy = await Policy.findOne({ policyNumber: req.body.policyNumber });
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    if (req.user.role === "customer" && String(policy.customerId || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Policy does not belong to this customer" });
    }

    if (!policy.customerId) {
      return res.status(400).json({ message: "Policy is not linked to a customer account" });
    }

    const claim = await Claim.create({
      ...req.body,
      customerId: policy.customerId,
      createdBy: req.user.id,
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error("Claim create error:", error);
    res.status(500).json({ message: "Claim create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "customer") {
      const policies = await Policy.find({ customerId: req.user.id }).select("policyNumber");
      query = {
        $or: [
          { customerId: req.user.id },
          { createdBy: req.user.id },
          { policyNumber: { $in: policies.map((policy) => policy.policyNumber) } },
        ],
      };
    }
    const claims = await Claim.find(query).sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    console.error("Claims fetch error:", error);
    res.status(500).json({ message: "Claims fetch failed" });
  }
});

router.put("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    const protectedFields = ["_id", "createdBy", "customerId", "policyNumber"];
    for (const field of protectedFields) delete req.body[field];

    Object.assign(claim, req.body);
    await claim.save();

    res.json(claim);
  } catch (error) {
    console.error("Claim update error:", error);
    res.status(500).json({ message: "Claim update failed" });
  }
});

router.delete("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: "Claim not found" });

    await claim.deleteOne();
    res.json({ message: "Claim deleted" });
  } catch (error) {
    console.error("Claim delete error:", error);
    res.status(500).json({ message: "Claim delete failed" });
  }
});

module.exports = router;