const router = require("express").Router();
const Claim = require("../models/Claim");
const auth = require("../middleware/auth");
const Policy = require("../models/Policy");

router.post("/", auth(), async (req, res) => {
  try {
    if (req.user.role === "customer") {
      const policy = await Policy.findOne({
        policyNumber: req.body.policyNumber,
        customerId: req.user.id,
      });

      if (!policy) {
        return res.status(403).json({ message: "Policy does not belong to this customer" });
      }
    }

    const claim = await Claim.create({
      ...req.body,
      customerId: req.user.role === "customer" ? req.user.id : req.body.customerId,
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
    const claim = await Claim.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(claim);
  } catch (error) {
    console.error("Claim update error:", error);
    res.status(500).json({ message: "Claim update failed" });
  }
});

router.delete("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    await Claim.findByIdAndDelete(req.params.id);
    res.json({ message: "Claim deleted" });
  } catch (error) {
    console.error("Claim delete error:", error);
    res.status(500).json({ message: "Claim delete failed" });
  }
});

module.exports = router;