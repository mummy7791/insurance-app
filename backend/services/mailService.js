const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

const sendOTP = async (email, otp) => {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Your Insurance App Verification OTP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Email Verification</h2>
        <p>Your verification OTP is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:20px 0">
          ${otp}
        </div>
        <p>This OTP is valid for a limited time.</p>
        <p>If you did not request this OTP, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = sendOTP;
