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
      localStorage.setItem(
        "insuranceUser",
        JSON.stringify(res.data.user)
      );

      alert("Login Successful");

      navigate("/customer-dashboard");
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
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
        background: "#f5f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 420,
          background: "#fff",
          borderRadius: 15,
          padding: 35,
          boxShadow: "0 10px 30px rgba(0,0,0,.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: 10,
            color: "#2563eb",
          }}
        >
          LifeSecure CRM
        </h1>

        <h3
          style={{
            textAlign: "center",
            marginBottom: 25,
          }}
        >
          Customer Login
        </h3>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: 10,
              borderRadius: 8,
              marginBottom: 15,
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
            padding: 12,
            marginBottom: 15,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 20,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />

        <button
          onClick={() => void login()}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {loading ? "Logging in..." : "Customer Login"}
        </button>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Don't have an account?

          <Link
            to="/register"
            style={{
              marginLeft: 5,
            }}
          >
            Register
          </Link>
        </div>

        <div
          style={{
            marginTop: 10,
            textAlign: "center",
          }}
        >
          <Link to="/admin-login">
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}