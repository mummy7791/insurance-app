const { Resend } = require("resend");

const sendOTP = async (email, otp) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "onboarding@resend.dev",
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

  if (error) {
    throw new Error(error.message || "Failed to send OTP email");
  }

  return data;
};

module.exports = sendOTP;
