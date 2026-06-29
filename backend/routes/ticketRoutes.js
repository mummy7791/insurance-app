const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const Ticket = require("../models/Ticket");

const generateTicketNumber = () => {
  return `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

router.get("/test", (req, res) => {
  res.json({
    message: "Ticket Route Working",
  });
});

router.post("/", auth(), async (req, res) => {
  try {
    const { subject, description, category, priority, customerId } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        message: "Subject and description required",
      });
    }

    const ticket = await Ticket.create({
      ticketNumber: generateTicketNumber(),
      customerId: customerId || null,
      createdBy: req.user?.id,
      subject: subject.trim(),
      description: description.trim(),
      category: category || "Other",
      priority: priority || "Medium",
      status: "Open",
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Ticket creation error:", error);
    res.status(500).json({
      message: "Ticket creation failed",
    });
  }
});

router.get("/", auth(), async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error("Tickets fetch error:", error);
    res.status(500).json({
      message: "Tickets fetch failed",
    });
  }
});

router.get("/:id", auth(), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Ticket fetch error:", error);
    res.status(500).json({
      message: "Ticket fetch failed",
    });
  }
});

router.put("/:id", auth(["admin", "bm", "unit_manager"]), async (req, res) => {
  try {
    const { status, assignedTo, resolution, priority } = req.body;

    const allowedStatus = ["Open", "In Progress", "Resolved", "Closed"];
    const allowedPriority = ["Low", "Medium", "High"];

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (status && allowedStatus.includes(status)) {
      ticket.status = status;
    }

    if (priority && allowedPriority.includes(priority)) {
      ticket.priority = priority;
    }

    if (assignedTo) {
      ticket.assignedTo = assignedTo;
    }

    if (typeof resolution === "string") {
      ticket.resolution = resolution;
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    res.json(updatedTicket);
  } catch (error) {
    console.error("Ticket update error:", error);
    res.status(500).json({
      message: "Ticket update failed",
    });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    res.json({
      message: "Ticket deleted",
    });
  } catch (error) {
    console.error("Ticket delete error:", error);
    res.status(500).json({
      message: "Delete failed",
    });
  }
});

module.exports = router;