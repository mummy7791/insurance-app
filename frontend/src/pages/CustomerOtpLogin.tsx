import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { confirmFirebasePhoneOtp, sendFirebasePhoneOtp } from "../services/firebasePhone";
import "../styles/Auth.css";

type AuthResponse = {
  token: string;
  user: { id: string; name: string; email: string; phone?: string; role: string; permissions?: string[] };
};

type LocationState = { phone?: string; mode?: "verify" | "login" };

const getMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    return e.response?.data?.message || fallback;
  }
  return fallback;
};

export default function CustomerOtpLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const pendingPhone = sessionStorage.getItem("pendingVerificationPhone") || "";
  const [phone, setPhone] = useState(state.phone || pendingPhone);
  const [otp, setOtp] = useState("");
  const mode: "verify" | "login" = state.mode || (pendingPhone ? "verify" : "login");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.phone) setPhone(state.phone);
  }, [state.phone]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const normalizedPhone = () => phone.replace(/\D/g, "").slice(-10);

  const sendOtp = async () => {
    const mobile = normalizedPhone();
    if (!/^[6-9]\d{9}$/.test(mobile)) return setError("Enter your registered 10-digit mobile number.");
    try {
      setLoading(true); setError(""); setNotice("");
      await sendFirebasePhoneOtp(mobile);
      setPhone(mobile);
      setSent(true);
      setResendSeconds(30);
      setNotice("A fresh 6-digit OTP was sent to your mobile number.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : getMessage(error, "Could not send OTP. Please try again.");
      setError(message);
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP from your SMS.");
    try {
      setLoading(true); setError("");
      const idToken = await confirmFirebasePhoneOtp(otp);
      const res = await api.post<AuthResponse>("/auth/firebase-phone-login", { phone: normalizedPhone(), idToken });
      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));
      sessionStorage.removeItem("pendingVerificationPhone");
      sessionStorage.removeItem("pendingVerificationEmail");
      const hasEstimate = Boolean(sessionStorage.getItem("premiumEstimate"));
      navigate(res.data.user.role === "advisor" ? "/insurance-plans" : hasEstimate ? "/insurance-plans" : "/customer-dashboard", { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : getMessage(error, "Invalid or expired OTP.");
      setError(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="otp-card">
        <div className="brand-mark brand-mark-logo"><img src="/securelife-logo.jpg" alt="SecureLife Insurance" /></div>
        <span className="auth-badge">MOBILE VERIFICATION</span>
        <h1>{mode === "verify" ? "Verify your mobile" : "Login with OTP"}</h1>
        <p className="otp-copy">{sent ? <>Enter the 6-digit code sent to <strong>+91 {phone}</strong>.</> : "Enter your registered mobile number and we will send a secure login code."}</p>

        <div id="firebase-recaptcha" />
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-success">{notice}</div>}

        {!sent ? (
          <>
            <label>Mobile number</label>
            <input className="auth-input" inputMode="numeric" autoComplete="tel" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" />
            <button className="auth-btn" onClick={() => void sendOtp()} disabled={loading}>{loading ? "Sending..." : "Send secure OTP"}</button>
          </>
        ) : (
          <>
            <div className="otp-input-wrap">
              <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus />
            </div>
            <button className="auth-btn" onClick={() => void verifyOtp()} disabled={loading || otp.length !== 6}>{loading ? "Verifying..." : "Verify & continue"}</button>
            <button className="auth-text-btn" onClick={() => void sendOtp()} disabled={loading || resendSeconds > 0}>{resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}</button>
            <button className="auth-text-btn muted" onClick={() => { setSent(false); setOtp(""); setNotice(""); setError(""); setResendSeconds(0); }}>Use another mobile number</button>
          </>
        )}

        <div className="auth-divider"><span>or</span></div>
        <p className="auth-link"><Link to="/login">Sign in with password</Link></p>
        <p className="auth-link small">New customer? <Link to="/register">Create account</Link></p>
      </div>
    </div>
  );
}
