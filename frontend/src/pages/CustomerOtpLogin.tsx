import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type AuthResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string; permissions?: string[] };
};

type LocationState = { email?: string; mode?: "verify" | "login" };

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
  const pendingEmail = sessionStorage.getItem("pendingVerificationEmail") || "";
  const [email, setEmail] = useState(state.email || pendingEmail);
  const [otp, setOtp] = useState("");
  const mode: "verify" | "login" = state.mode || (pendingEmail ? "verify" : "login");
  const [sent, setSent] = useState(Boolean((state.mode === "verify" && state.email) || pendingEmail));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(sent ? "Verification code sent. Check your inbox and spam folder." : "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.email) setEmail(state.email);
  }, [state.email]);

  const sendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError("Enter your registered email address.");

    try {
      setLoading(true); setError(""); setNotice("");
      await api.post("/auth/send-login-otp", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setSent(true);
      setNotice("A fresh 6-digit OTP was sent to your email.");
    } catch (error: unknown) {
      setError(getMessage(error, "Could not send OTP. Please try again."));
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP from your email.");

    try {
      setLoading(true); setError("");
      const endpoint = mode === "verify" ? "/auth/verify-otp" : "/auth/login-with-otp";
      const res = await api.post<AuthResponse>(endpoint, { email: email.trim().toLowerCase(), otp });
      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));
      sessionStorage.removeItem("pendingVerificationEmail");
      const hasEstimate = Boolean(sessionStorage.getItem("premiumEstimate"));
      navigate(res.data.user.role === "advisor" ? "/insurance-plans" : hasEstimate ? "/insurance-plans" : "/customer-dashboard", { replace: true });
    } catch (error: unknown) {
      setError(getMessage(error, "Invalid or expired OTP."));
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="otp-card">
        <div className="brand-mark brand-mark-logo"><img src="/securelife-logo.jpg" alt="SecureLife Insurance" /></div>
        <span className="auth-badge">EMAIL VERIFICATION</span>
        <h1>{mode === "verify" ? "Verify your account" : "Login with OTP"}</h1>
        <p className="otp-copy">{sent ? <>Enter the 6-digit code sent to <strong>{email}</strong>.</> : "Enter your registered email and we will send a secure login code."}</p>

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-success">{notice}</div>}

        {!sent ? (
          <>
            <label>Email address</label>
            <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            <button className="auth-btn" onClick={() => void sendOtp()} disabled={loading}>{loading ? "Sending..." : "Send secure OTP"}</button>
          </>
        ) : (
          <>
            <div className="otp-input-wrap">
              <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus />
            </div>
            <button className="auth-btn" onClick={() => void verifyOtp()} disabled={loading || otp.length !== 6}>{loading ? "Verifying..." : "Verify & continue"}</button>
            <button className="auth-text-btn" onClick={() => void sendOtp()} disabled={loading}>Resend OTP</button>
            <button className="auth-text-btn muted" onClick={() => { setSent(false); setOtp(""); setNotice(""); }}>Use another email</button>
          </>
        )}

        <div className="auth-divider"><span>or</span></div>
        <p className="auth-link"><Link to="/login">Sign in with password</Link></p>
        <p className="auth-link small">New customer? <Link to="/register">Create account</Link></p>
      </div>
    </div>
  );
}