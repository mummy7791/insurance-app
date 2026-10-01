const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

const normalizeIndianMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

const sendSmsOTP = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error("FAST2SMS_API_KEY is not configured");

  const mobile = normalizeIndianMobile(phone);
  if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error("Invalid Indian mobile number");

  const response = await fetch(FAST2SMS_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: String(otp),
      numbers: mobile,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.return === false) {
    const message = data.message || data.error || `Fast2SMS request failed (${response.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }
  return data;
};

module.exports = { sendSmsOTP, normalizeIndianMobile };
