const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");

/* CUSTOMER PROFILE BY EMAIL */
router.get("/me/:email", async (req, res) => {
  try {
    const customer = await Customer.findOne({ email: req.params.email });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ADMIN CREATE / ASSIGN CUSTOMER POLICY */
router.post("/assign-policy", async (req, res) => {
  try {
    const data = req.body;

    if (!data.email) {
      return res.status(400).json({ message: "Customer email required" });
    }

    const customer = await Customer.findOneAndUpdate(
      { email: data.email },
      data,
      { new: true, upsert: true }
    );

    res.status(201).json({
      message: "Policy assigned successfully",
      customer,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ADMIN GET ALL CUSTOMERS */
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;