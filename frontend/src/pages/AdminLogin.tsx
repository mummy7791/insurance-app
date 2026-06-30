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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/ic_launcher.png" alt="ICICI Life" />
        </div>

        <h1 className="auth-title">ICICI LIFE</h1>
        <h2 className="auth-subtitle">Admin Login</h2>

        <div className="auth-form">
          <input
            className="auth-input"
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="auth-btn"
            onClick={() => void login()}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Admin Login"}
          </button>
        </div>

        <p className="auth-links">
          Customer account?
          <Link to="/login">Customer Login</Link>
        </p>
      </div>
    </div>
  );
}