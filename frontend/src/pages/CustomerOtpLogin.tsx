import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
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
  const [sent, setSent] = useState(Boolean((state.mode === "verify" && state.phone) || pendingPhone));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(sent ? "Verification code sent to your mobile number." : "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.phone) setPhone(state.phone);
  }, [state.phone]);

  const normalizedPhone = () => phone.replace(/\D/g, "").slice(-10);

  const sendOtp = async () => {
    const mobile = normalizedPhone();
    if (!/^[6-9]\d{9}$/.test(mobile)) return setError("Enter your registered 10-digit mobile number.");
    try {
      setLoading(true); setError(""); setNotice("");
      await api.post("/auth/send-login-otp", { phone: mobile });
      setPhone(mobile);
      setSent(true);
      setNotice("A fresh 6-digit OTP was sent to your mobile number.");
    } catch (error: unknown) {
      setError(getMessage(error, "Could not send OTP. Please try again."));
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP from your SMS.");
    try {
      setLoading(true); setError("");
      const endpoint = mode === "verify" ? "/auth/verify-otp" : "/auth/login-with-otp";
      const res = await api.post<AuthResponse>(endpoint, { phone: normalizedPhone(), otp });
      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));
      sessionStorage.removeItem("pendingVerificationPhone");
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
        <span className="auth-badge">MOBILE VERIFICATION</span>
        <h1>{mode === "verify" ? "Verify your mobile" : "Login with OTP"}</h1>
        <p className="otp-copy">{sent ? <>Enter the 6-digit code sent to <strong>+91 {phone}</strong>.</> : "Enter your registered mobile number and we will send a secure login code."}</p>

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
            <button className="auth-text-btn" onClick={() => void sendOtp()} disabled={loading}>Resend OTP</button>
            <button className="auth-text-btn muted" onClick={() => { setSent(false); setOtp(""); setNotice(""); }}>Use another mobile number</button>
          </>
        )}

        <div className="auth-divider"><span>or</span></div>
        <p className="auth-link"><Link to="/login">Sign in with password</Link></p>
        <p className="auth-link small">New customer? <Link to="/register">Create account</Link></p>
      </div>
    </div>
  );
}
