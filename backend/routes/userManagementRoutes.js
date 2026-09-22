const bcrypt = require("bcryptjs");
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const auth = require("../middleware/auth");
const createAuditLog = require("../utils/createAuditLog");
const PendingAdvisor = require("../models/PendingAdvisor");
const sendOTP = require("../services/mailService");
const crypto = require("crypto");

const allowedRoles = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "agent",
  "advisor",
];

const allowedStatus = ["active", "blocked"];


router.post("/advisor/request-otp", auth(["admin"]), async (req,res)=>{try{
 const {name,email,phone,advisorCode,address,password,status}=req.body; const cleanEmail=String(email||"").toLowerCase().trim();
 if(!name||!cleanEmail||!phone||!advisorCode||!password) return res.status(400).json({message:"Name, email, phone, advisor code and password are required"});
 if(String(password).length<8) return res.status(400).json({message:"Password must be at least 8 characters"});
 if(await User.findOne({email:cleanEmail})) return res.status(409).json({message:"User already exists with this email"});
 const otp=crypto.randomInt(100000,1000000).toString(); const hashedPassword=await bcrypt.hash(String(password),10);
 await PendingAdvisor.deleteMany({email:cleanEmail});
 const pending=await PendingAdvisor.create({name:String(name).trim(),email:cleanEmail,phone,advisorCode,address:address||"",password:hashedPassword,status:status||"active",otp,otpExpires:new Date(Date.now()+10*60*1000),expiresAt:new Date(Date.now()+30*60*1000)});
 await sendOTP(cleanEmail,otp);
 res.json({message:"OTP sent to advisor email",verificationId:pending._id,email:cleanEmail});
 }catch(error){console.error("Advisor OTP send error:",error);res.status(500).json({message:"Could not send advisor OTP"});}});
router.post("/advisor/verify-otp", auth(["admin"]), async(req,res)=>{try{
 const {verificationId,otp}=req.body; const pending=await PendingAdvisor.findById(verificationId);
 if(!pending||pending.expiresAt<new Date()) return res.status(400).json({message:"Verification session expired"});
 if(pending.otpExpires<new Date()) return res.status(400).json({message:"OTP expired. Send a new OTP"});
 if(pending.otp!==String(otp||"").trim()){pending.otpAttempts=(pending.otpAttempts||0)+1;await pending.save();if(pending.otpAttempts>=5){await PendingAdvisor.findByIdAndDelete(pending._id);return res.status(429).json({message:"Too many invalid attempts. Send OTP again"});}return res.status(400).json({message:"Invalid OTP"});}
 pending.verifiedAt=new Date(); pending.otp="VERIFIED"; await pending.save(); res.json({message:"Email verified. You can create the advisor now.",verificationId:pending._id});
 }catch(error){console.error("Advisor OTP verify error:",error);res.status(500).json({message:"OTP verification failed"});}});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const { name, email, role, status, phone, advisorCode, address, password, verificationId } = req.body;

    if (!name || !email || !role || (role === "advisor" && (!phone || !advisorCode || !password))) {
      return res.status(400).json({
        message: role === "advisor" ? "Name, email, phone, advisor code and password are required" : "Name, email and role are required",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    let hashedPassword = password ? await bcrypt.hash(String(password), 10) : await bcrypt.hash("ChangeMe123", 10);

    if (role === "advisor") {
      const pending = verificationId ? await PendingAdvisor.findById(verificationId) : null;
      if (!pending || !pending.verifiedAt || pending.email !== cleanEmail) return res.status(403).json({ message: "Verify advisor email OTP before creating account" });
      hashedPassword = pending.password;
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone || "",
      advisorCode: advisorCode || "",
      address: address || "",
      password: hashedPassword,
      role,
      status: status || "active",
      isEmailVerified: role === "advisor",
      permissions: role === "advisor" ? ["plans", "commission", "profile"] : [],
    });

    if (role === "advisor" && verificationId) await PendingAdvisor.findByIdAndDelete(verificationId);

    await createAuditLog({
      req,
      action: "CREATE",
      module: "USER_MANAGEMENT",
      description: `Created user ${user.name} (${user.email}) with role ${user.role}`,
      targetUserId: user._id,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      advisorCode: user.advisorCode,
      address: user.address,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("User create error:", error);
    res.status(500).json({ message: "User create failed" });
  }
});

router.get("/", auth(["admin"]), async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -refreshToken")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Users fetch error:", error);
    res.status(500).json({ message: "Users fetch failed" });
  }
});

router.put("/:id/role", auth(["admin"]), async (req, res) => {
  try {
    const { role } = req.body;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditLog({
      req,
      action: "ROLE_UPDATE",
      module: "USER_MANAGEMENT",
      description: `Updated user ${user.email} role to ${user.role}`,
      targetUserId: user._id,
    });

    res.json(user);
  } catch (error) {
    console.error("Role update error:", error);
    res.status(500).json({ message: "Role update failed" });
  }
});

router.put("/:id/status", auth(["admin"]), async (req, res) => {
  try {
    const { status } = req.body;

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditLog({
      req,
      action: "STATUS_UPDATE",
      module: "USER_MANAGEMENT",
      description: `Updated user ${user.email} status to ${user.status}`,
      targetUserId: user._id,
    });

    res.json(user);
  } catch (error) {
    console.error("User status update error:", error);
    res.status(500).json({ message: "User status update failed" });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditLog({
      req,
      action: "DELETE",
      module: "USER_MANAGEMENT",
      description: `Deleted user ${user.name} (${user.email})`,
      targetUserId: user._id,
    });

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("User delete error:", error);
    res.status(500).json({ message: "User delete failed" });
  }
});

module.exports = router;