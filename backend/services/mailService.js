const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "LifeSecure CRM - OTP Verification",
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#c4003b">LifeSecure CRM</h2>
        <p>Your OTP verification code is:</p>
        <h1 style="letter-spacing:4px;color:#0f172a">${otp}</h1>
        <p>This OTP is valid for <b>10 minutes</b>.</p>
      </div>
    `,
  });
};

module.exports = sendOTP;