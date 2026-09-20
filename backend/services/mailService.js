const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

const encodeMessage = (message) =>
  Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const sendOTP = async (email, otp) => {
  if (
    !process.env.GMAIL_CLIENT_ID ||
    !process.env.GMAIL_CLIENT_SECRET ||
    !process.env.GMAIL_REFRESH_TOKEN ||
    !process.env.GMAIL_USER
  ) {
    throw new Error("Gmail API credentials are not configured");
  }

  const subject = "Your Insurance App Verification OTP";

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

  const message = [
    `From: Insurance App <${process.env.GMAIL_USER}>`,
    `To: ${email}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(message),
    },
  });

  return result.data;
};

module.exports = sendOTP;
