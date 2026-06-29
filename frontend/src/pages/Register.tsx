import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

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
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
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
    password: "",
    phone: "",
  });

  const register = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password required");
      return;
    }

    try {
      const res = await api.post<AuthResponse>("/auth/register", form);

      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem("insuranceUser", JSON.stringify(res.data.user));

      alert("Customer registered successfully");
      navigate("/customer-dashboard");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>👤 Customer Register</h1>

        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button onClick={() => void register()}>Register</button>

        <p>
          Already have account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}