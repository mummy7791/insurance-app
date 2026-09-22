import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Email and password required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<LoginResponse>("/auth/admin-login", {
        email,
        password,
      });

      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell staff-auth-shell">
      <section className="auth-visual staff-auth-visual">
        <Link className="auth-brand" to="/"><span className="auth-brand-mark">S</span><span>SecureLife</span></Link>
        <div className="auth-visual-copy">
          <span className="auth-kicker">OPERATIONS PORTAL</span>
          <h1>Run insurance operations from one secure workspace.</h1>
          <p>Manage customers, policies, premiums, claims, teams and reporting with role-based access.</p>
          <div className="staff-trust-grid"><div><strong>Role based</strong><span>Controlled access</span></div><div><strong>Audited</strong><span>Activity visibility</span></div><div><strong>Secure</strong><span>Protected sessions</span></div></div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-card">
          <span className="auth-kicker">STAFF SIGN IN</span>
          <h2>Welcome back</h2>
          <p className="auth-form-intro">Use your existing SecureLife staff credentials.</p>
          <div className="auth-form">
            <label className="auth-field-label">Email address</label>
            <input className="auth-input" type="email" placeholder="Staff email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            <label className="auth-field-label">Password</label>
            <div className="password-field"><input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div>
            <button className="auth-btn" onClick={() => void login()} disabled={loading}>{loading ? "Signing in..." : "Sign in to operations"}</button>
          </div>
          <div className="staff-login-note"><strong>Existing account preserved</strong><span>Your admin email and password are not changed by this redesign.</span></div>
          <p className="auth-links">Advisor account? <Link to="/advisor-login">Advisor Login</Link></p>\n          <p className="auth-links">Customer account? <Link to="/login">Customer Login</Link></p>
        </div>
      </section>
    </div>
  );
}