const { sendEmail } = require("./gmailService");

const sendOTP = async (email, otp) => {
  const subject = "Your Insurance App Verification OTP";

  const text = `Your verification OTP is ${otp}. This OTP is valid for a limited time.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2>Email Verification</h2>
      <p>Your verification OTP is:</p>

      <div style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:20px 0">
        ${otp}
      </div>

      <p>This OTP is valid for a limited time.</p>
      <p>If you did not request this OTP, you can ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

module.exports = sendOTP;
