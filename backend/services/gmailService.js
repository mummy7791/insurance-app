const { google } = require("googleapis");

const requiredEnv = [
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_USER",
];

const encodeMessage = (message) =>
  Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const sendEmail = async ({ to, subject, text, html }) => {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error("Gmail API configuration is incomplete");
  }

  if (/[\r\n]/.test(to) || /[\r\n]/.test(subject)) {
    throw new Error("Invalid email headers");
  }

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

  const body = html || String(text || "").replace(/\r?\n/g, "<br />");

  const rawMessage = [
    `From: Insurance App <${process.env.GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");

  return gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(rawMessage),
    },
  });
};

module.exports = { sendEmail };
