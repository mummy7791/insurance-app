const router = require("express").Router();
const Policy = require("../models/Policy");
const auth = require("../middleware/auth");

/* CREATE POLICY */
router.post("/", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const policy = await Policy.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error("Policy create error:", error);
    res.status(500).json({ message: "Policy create failed" });
  }
});

/* GET ALL POLICIES - customer ki kanipinchadaniki */
router.get("/", auth(), async (req, res) => {
  try {
    const query = req.user.role === "customer" ? { customerId: req.user.id } : {};
    const policies = await Policy.find(query).sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) {
    console.error("Policies fetch error:", error);
    res.status(500).json({ message: "Policies fetch failed" });
  }
});

/* POLICY PURCHASES
   Customer purchases are created only through the verified plan-payment flow.
   Do not expose a generic endpoint that can assign an existing policy to a customer. */

/* UPDATE POLICY */
router.put("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    const protectedFields = ["_id", "createdBy", "customerId", "policyNumber"];
    for (const field of protectedFields) delete req.body[field];

    Object.assign(policy, req.body);
    await policy.save();

    res.json(policy);
  } catch (error) {
    console.error("Policy update error:", error);
    res.status(500).json({ message: "Policy update failed" });
  }
});

/* DELETE POLICY */
router.delete("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "agent"]), async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    await policy.deleteOne();
    res.json({ message: "Policy deleted" });
  } catch (error) {
    console.error("Policy delete error:", error);
    res.status(500).json({ message: "Policy delete failed" });
  }
});

module.exports = router;