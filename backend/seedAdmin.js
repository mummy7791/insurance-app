const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdmin() {
  try {
    const admin = await User.findOne({
      email: "admin@gmail.com",
    });

    if (admin) {
      console.log("✅ Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("mummy@7791", 10);

    await User.create({
      name: "Super Admin",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
    });

    console.log("✅ Default Admin Created");
  } catch (err) {
    console.error(err);
  }
}

module.exports = seedAdmin;