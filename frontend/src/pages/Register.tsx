import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/Auth.css";

type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
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
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<AuthResponse>("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "customer",
      });

      const user = {
        ...res.data.user,
        role: "customer",
      };

      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(user));

      alert("Customer registered successfully");
      navigate("/customer-dashboard");
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
            className="auth-btn"
            onClick={() => void register()}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </div>

        <p className="auth-links">
          Already have an account?
          <Link to="/login">Login</Link>
        </p>

        <Link className="auth-secondary-link" to="/admin-login">
          Admin Login
        </Link>
      </div>
    </div>
  );
}