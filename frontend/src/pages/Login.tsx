import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));

      alert("Login Successful");
      navigate("/customer-dashboard");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const error = err as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        setError(error.response?.data?.message || "Login failed");
      } else {
        setError("Server error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #fff7ed 0%, #fee2e2 45%, #ffffff 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#fff",
          borderRadius: 24,
          padding: 35,
          boxShadow: "0 20px 50px rgba(220, 38, 38, 0.18)",
          borderTop: "6px solid #dc2626",
        }}
      >
        <img
          src="ic_launcher.png"
          alt="ICICI Life Logo"
          style={{
            width: 95,
            height: 95,
            display: "block",
            margin: "0 auto 18px",
            objectFit: "contain",
            borderRadius: 18,
          }}
        />

        <h1
          style={{
            textAlign: "center",
            marginBottom: 6,
            fontSize: 34,
            fontWeight: 900,
            background: "linear-gradient(90deg, #dc2626, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ICICI LIFE
        </h1>

        <h3
          style={{
            textAlign: "center",
            marginBottom: 28,
            color: "#555",
            fontWeight: 600,
          }}
        >
          Customer Login
        </h3>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            marginBottom: 16,
            borderRadius: 12,
            border: "1px solid #fecaca",
            outline: "none",
            fontSize: 15,
          }}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            marginBottom: 22,
            borderRadius: 12,
            border: "1px solid #fecaca",
            outline: "none",
            fontSize: 15,
          }}
        />

        <button
          onClick={() => void login()}
          disabled={loading}
          style={{
            width: "100%",
            padding: 15,
            background: "linear-gradient(90deg, #dc2626, #f97316)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 10px 24px rgba(220, 38, 38, 0.32)",
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading ? "Logging in..." : "Customer Login"}
        </button>

        <div style={{ marginTop: 22, textAlign: "center", color: "#555" }}>
          Don't have an account?
          <Link
            to="/register"
            style={{
              marginLeft: 6,
              color: "#dc2626",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Register
          </Link>
        </div>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Link
            to="/admin-login"
            style={{
              color: "#f97316",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}