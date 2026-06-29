import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

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

  const login = async () => {
    if (!email || !password) {
      alert("Email and password required");
      return;
    }

    try {
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
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🛡️ Admin Login</h1>
        <p>LifeSecure CRM Admin Panel</p>

        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={() => void login()}>Login</button>
      </div>
    </div>
  );
}