const express = require("express");
const router = express.Router();

const Commission = require("../models/Commission");
const auth = require("../middleware/auth");

const pickCommissionFields = (body = {}) => {
  const allowedFields = [
    "employeeName",
    "employeeRole",
    "customerName",
    "policyNumber",
    "premiumAmount",
    "commissionRate",
    "commissionAmount",
    "month",
    "status",
    "remarks",
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  return payload;
};

const parseNonNegativeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
};

const validateCommissionNumbers = (payload, requireAll = false) => {
  const numericFields = [
    "premiumAmount",
    "commissionRate",
    "commissionAmount",
  ];

  for (const field of numericFields) {
    const hasField = Object.prototype.hasOwnProperty.call(payload, field);

    if (requireAll && !hasField) {
      return `${field} is required`;
    }

    if (hasField) {
      const value = parseNonNegativeNumber(payload[field]);

      if (value === null) {
        return `${field} must be a valid non-negative number`;
      }

      payload[field] = value;
    }
  }

  return null;
};

router.post("/", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    const payload = pickCommissionFields(req.body);
    const validationError = validateCommissionNumbers(payload, true);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const commission = await Commission.create({
      ...payload,
      createdBy: req.user.id,
    });

    res.status(201).json(commission);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Commission create failed",
    });
  }
});

router.get("/", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const query = ["advisor", "agent"].includes(req.user.role)
      ? { createdBy: req.user.id }
      : {};

    const commissions = await Commission.find(query).sort({
      createdAt: -1,
    });

    res.json(commissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Commission fetch failed",
    });
  }
});

router.get("/:id", auth(["admin", "bm", "unit_manager", "agency_manager", "advisor", "agent"]), async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...(["advisor", "agent"].includes(req.user.role)
        ? { createdBy: req.user.id }
        : {}),
    };

    const commission = await Commission.findOne(query);

    if (!commission) {
      return res.status(404).json({
        message: "Commission not found",
      });
    }

    res.json(commission);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Commission fetch failed",
    });
  }
});

router.put("/:id", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    const payload = pickCommissionFields(req.body);
    const validationError = validateCommissionNumbers(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!commission) {
      return res.status(404).json({ message: "Commission not found" });
    }

    res.json(commission);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Commission update failed",
    });
  }
});

router.delete("/:id", auth(["admin", "bm", "unit_manager", "agency_manager"]), async (req, res) => {
  try {
    await Commission.findByIdAndDelete(req.params.id);

    res.json({
      message: "Commission deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Commission delete failed",
    });
  }
});

module.exports = router;