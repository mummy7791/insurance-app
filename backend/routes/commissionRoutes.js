const express = require("express");
const router = express.Router();

const Commission = require("../models/Commission");
const auth = require("../middleware/auth");

router.post("/", auth(), async (req, res) => {
  try {
    const commission = await Commission.create({
      ...req.body,
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

router.get("/", auth(), async (req, res) => {
  try {
    const commissions = await Commission.find().sort({
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

router.get("/:id", auth(), async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);

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

router.put("/:id", auth(), async (req, res) => {
  try {
    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );

    res.json(commission);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Commission update failed",
    });
  }
});

router.delete("/:id", auth(), async (req, res) => {
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