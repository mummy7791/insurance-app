const router = require("express").Router();
const Customer = require("../models/Customer");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      createdBy: req.user.id,
      assignedAgent: req.user.id,
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error("Customer create error:", error);
    res.status(500).json({ message: "Customer create failed" });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "agent") {
      filter = { assignedAgent: req.user.id };
    }

    const customers = await Customer.find(filter)
      .populate("assignedAgent", "name role")
      .sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    console.error("Customers fetch error:", error);
    res.status(500).json({ message: "Customers fetch failed" });
  }
});

router.put("/:id", auth(), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(customer);
  } catch (error) {
    console.error("Customer update error:", error);
    res.status(500).json({ message: "Customer update failed" });
  }
});

router.delete("/:id", auth(), async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted" });
  } catch (error) {
    console.error("Customer delete error:", error);
    res.status(500).json({ message: "Customer delete failed" });
  }
});

module.exports = router;