const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");

/* CUSTOMER PROFILE BY EMAIL */
router.get("/me/:email", async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();

    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json(customer);
  } catch (err) {
    console.error("Customer profile error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ADMIN CREATE / ASSIGN CUSTOMER POLICY */
router.post("/assign-policy", async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.email) {
      return res.status(400).json({ message: "Customer email required" });
    }

    const email = String(data.email).trim().toLowerCase();

    const payload = {
      ...data,
      email,
      name: data.name || "Customer",
      status: data.status || "ACTIVE",
      members: Array.isArray(data.members)
        ? data.members
        : String(data.members || "")
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
    };

    const customer = await Customer.findOneAndUpdate(
      { email },
      { $set: payload },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      message: "Policy assigned successfully",
      customer,
    });
  } catch (err) {
    console.error("Assign policy error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/* ADMIN GET ALL CUSTOMERS */
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return res.json(customers);
  } catch (err) {
    console.error("Customers list error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;