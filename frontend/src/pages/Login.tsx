import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type LoginResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
};

const getMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    return e.response?.data?.message || "Sign in failed";
  }
  return "Sign in failed";
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    try {
      setLoading(true); setError("");
      const res = await api.post<LoginResponse>("/auth/login", { email: email.trim().toLowerCase(), password });
      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));
      const hasEstimate = Boolean(sessionStorage.getItem("premiumEstimate"));
      navigate(res.data.user.role === "customer" && hasEstimate ? "/insurance-plans" : res.data.user.role === "customer" ? "/customer-dashboard" : "/dashboard");
    } catch (error: unknown) {
      const message = getMessage(error);
      setError(message);
      if (message.toLowerCase().includes("verify")) {
        sessionStorage.setItem("pendingVerificationEmail", email.trim().toLowerCase());
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <span className="auth-badge">YOUR PROTECTION HUB</span>
          <h1>Insurance in your pocket.</h1>
          <p>Access policies, premium reminders, claims, KYC documents and protection plans with one secure account.</p>
          <div className="auth-stat-strip"><div><strong>24×7</strong><span>Policy access</span></div><div><strong>100%</strong><span>Digital journey</span></div><div><strong>Secure</strong><span>OTP verification</span></div></div>
        </section>

        <section className="auth-card modern-auth-card">
          <div className="brand-mark">S</div>
          <h1 className="auth-title">SecureLife</h1>
          <p className="auth-kicker">Welcome back, policyholder</p>
          <div className="login-method-note">Use your password, or choose email OTP below.</div>

          {error && <div className="auth-error">{error}</div>}

          <label>Email address</label>
          <input className="auth-input" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>Password</label>
          <div className="password-field">
            <input className="auth-input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
          </div>

          <button className="auth-btn" onClick={() => void login()} disabled={loading}>{loading ? "Signing in securely..." : "Sign in with password"}</button>

          {error.toLowerCase().includes("verify") && (
            <button className="auth-outline-btn" onClick={() => navigate("/customer-otp-login", { state: { email: email.trim().toLowerCase(), mode: "verify" } })}>Verify email with OTP</button>
          )}

          <div className="auth-divider"><span>or</span></div>
          <button className="auth-outline-btn" onClick={() => navigate("/customer-otp-login", { state: { email: email.trim().toLowerCase(), mode: "login" } })}>Send OTP to email</button>

          <p className="auth-link">New to SecureLife? <Link to="/register">Create account</Link></p>
          <p className="auth-link small"><Link to="/admin-login">Staff / Admin login</Link></p>
        </section>
      </div>
    </div>
  );
}