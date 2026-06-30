import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type AuthResponse = {
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  email?: string;
  message?: string;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || "Register failed";
  }

  return "Register failed";
};

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      alert("Name, email and password required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<AuthResponse>("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: "customer",
      });

      if (res.data.token && res.data.user) {
        const user = {
          ...res.data.user,
          role: "customer",
        };

        localStorage.setItem("insuranceToken", res.data.token);
        localStorage.setItem("insuranceUser", JSON.stringify(user));

        alert("Customer registered successfully");
        navigate("/customer-dashboard");
        return;
      }

      alert(res.data.message || "Customer registered successfully");
      navigate("/login");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/ic_launcher.png" alt="ICICI Life" />
        </div>

        <h1 className="auth-title">ICICI LIFE</h1>
        <h2 className="auth-subtitle">Customer Register</h2>

        <div className="auth-form">
          <input
            className="auth-input"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="auth-input"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            className="auth-input"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button
            type="button"
            className="auth-btn"
            onClick={() => void register()}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </div>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <p className="auth-link small">
          <Link to="/admin-login">Admin Login</Link>
        </p>
      </div>
    </div>
  );
}