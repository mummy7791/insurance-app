const express = require("express");
const router = express.Router();

const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

router.post(
  "/",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const employee = await Employee.create({
        ...req.body,
        createdBy: req.user.id,
      });

      res.status(201).json(employee);
    } catch (error) {
      console.error("Employee create error:", error);
      res.status(500).json({ message: "Employee create failed" });
    }
  }
);

router.get(
  "/",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const employees = await Employee.find().sort({ createdAt: -1 });
      res.json(employees);
    } catch (error) {
      console.error("Employees fetch error:", error);
      res.status(500).json({ message: "Employees fetch failed" });
    }
  }
);

router.put(
  "/:id",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const employee = await Employee.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      res.json(employee);
    } catch (error) {
      console.error("Employee update error:", error);
      res.status(500).json({ message: "Employee update failed" });
    }
  }
);

router.delete("/:id", auth(["admin", "bm"]), async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted" });
  } catch (error) {
    console.error("Employee delete error:", error);
    res.status(500).json({ message: "Employee delete failed" });
  }
});

module.exports = router;