import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type AuthResponse = { email?: string; message?: string };

const errorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    return e.response?.data?.message || "Unable to create account";
  }
  return "Unable to create account";
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const register = async () => {
    setError("");
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!name || !email || !form.password) {
      setError("Please enter your name, email and password.");
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("Password must be at least 8 characters with a letter and number.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post<AuthResponse>("/auth/register", {
        name, email, phone, password: form.password,
      });
      sessionStorage.setItem("pendingVerificationEmail", res.data.email || email);
      navigate("/customer-otp-login", {
        state: { email: res.data.email || email, mode: "verify" },
      });
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <span className="auth-badge">SECURE • SIMPLE • DIGITAL</span>
          <h1>Protect what matters most.</h1>
          <p>Create your policyholder account to manage cover, premiums, claims and documents from one secure place.</p>
          <div className="auth-trust-row"><span>✓ Email verified access</span><span>✓ Secure policy dashboard</span><span>✓ Digital claims support</span></div>
        </section>

        <section className="auth-card modern-auth-card">
          <div className="brand-mark">S</div>
          <h1 className="auth-title">SecureLife</h1>
          <p className="auth-kicker">Create your customer account</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-form">
            <label>Full name</label>
            <input className="auth-input" autoComplete="name" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Email address</label>
            <input className="auth-input" type="email" autoComplete="email" placeholder="name@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label>Mobile number</label>
            <input className="auth-input" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
            <label>Password</label>
            <input className="auth-input" type="password" autoComplete="new-password" placeholder="Minimum 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

            <button type="button" className="auth-btn" onClick={() => void register()} disabled={loading}>
              {loading ? "Creating secure account..." : "Create account & verify email"}
            </button>
          </div>

          <p className="auth-note">We will send a 6-digit verification code to your email.</p>
          <p className="auth-link">Already registered? <Link to="/login">Sign in</Link></p>
          <p className="auth-link small"><Link to="/admin-login">Staff / Admin login</Link></p>
        </section>
      </div>
    </div>
  );
}