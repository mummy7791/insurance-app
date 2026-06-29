import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function CustomerOtpLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!email) {
      alert("Enter email");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/send-login-otp", {
        email,
      });

      alert("OTP sent successfully");
      setStep(2);
    } catch (err) {
      console.error(err);
      alert("OTP send failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      alert("Enter OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<LoginResponse>("/auth/login-with-otp", {
        email,
        otp,
      });

      localStorage.setItem("insuranceToken", res.data.token);
      localStorage.setItem(
        "insuranceUser",
        JSON.stringify(res.data.user)
      );

      alert("Login Success");

      navigate("/customer-dashboard");
    } catch (err) {
      console.error(err);
      alert("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <h1>Customer OTP Login</h1>

        {step === 1 ? (
          <>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              className="btn"
              onClick={() => void sendOtp()}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <input value={email} disabled />

            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <button
              className="btn"
              onClick={() => void verifyOtp()}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              className="mini-btn"
              onClick={() => void sendOtp()}
            >
              Resend OTP
            </button>
          </>
        )}

        <hr />

        <Link to="/customer-register">
          New Customer? Register
        </Link>

      </div>
    </div>
  );
}