const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const name = String(process.env.ADMIN_NAME || "Super Admin").trim();

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an admin");
  }

  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters and include a letter and number");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin account already exists; seed skipped");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({
    name,
    email,
    password: hashedPassword,
    role: "admin",
    status: "active",
    isEmailVerified: true,
  });

  console.log("Admin account created from environment configuration");
}

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;

  if (!mongoUrl) {
    console.error("MONGO_URL is required");
    process.exit(1);
  }

  mongoose
    .connect(mongoUrl)
    .then(async () => {
      await seedAdmin();
      await mongoose.disconnect();
    })
    .catch((error) => {
      console.error("Admin seed failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = seedAdmin;
