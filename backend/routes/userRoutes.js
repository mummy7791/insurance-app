const router = require("express").Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

router.get(
  "/",
  auth(["admin", "bm", "unit_manager", "agency_manager"]),
  async (req, res) => {
    try {
      const users = await User.find().select("-password -refreshToken");
      res.json(users);
    } catch {
      res.status(500).json({ message: "Users fetch failed" });
    }
  }
);

router.get("/me", auth(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshToken"
    );

    res.json(user);
  } catch {
    res.status(500).json({ message: "Profile fetch failed" });
  }
});

module.exports = router;