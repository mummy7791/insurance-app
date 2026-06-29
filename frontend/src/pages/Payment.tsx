import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKey: string;
  plan: {
    id: string;
    planName: string;
    category: string;
    coverageAmount: number;
    yearlyPremium: number;
    paymentYears: number;
  };
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  }

  return fallback;
};

export default function Payment() {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      const loadOrder = async () => {
        if (!planId) return;

        try {
          setLoading(true);

          const res = await api.post<OrderResponse>(
            `/plan-purchases/create-order/${planId}`
          );

          if (active) {
            setOrder(res.data);
          }
        } catch (error: unknown) {
          alert(getErrorMessage(error, "Payment order create failed"));
          navigate("/insurance-plans");
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadOrder();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [planId, navigate]);

  const startPayment = () => {
    if (!order || !planId) {
      alert("Order not ready");
      return;
    }

    if (!window.Razorpay) {
      alert("Razorpay not loaded. Please refresh page.");
      return;
    }

    const userRaw = localStorage.getItem("insuranceUser");
    const user = userRaw ? JSON.parse(userRaw) : {};

    setPaying(true);

    const options: RazorpayOptions = {
      key: order.razorpayKey,
      amount: order.amount * 100,
      currency: order.currency,
      name: "LifeSecure CRM",
      description: order.plan.planName,
      order_id: order.orderId,
      prefill: {
        name: user.name || "",
        email: user.email || "",
        contact: user.phone || "",
      },
      theme: {
        color: "#2563eb",
      },
      handler: (response) => {
        void verifyPayment(response);
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
    setPaying(false);
  };

  const verifyPayment = async (response: RazorpayResponse) => {
    if (!planId) return;

    try {
      setPaying(true);

      await api.post("/plan-purchases/verify-payment", {
        planId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      alert("Payment successful. Plan activated.");
      navigate("/customer-dashboard");
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Payment verification failed"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <MainLayout
      title="Online Payment"
      subtitle="Complete payment to activate your insurance plan"
    >
      <div className="section">
        {loading ? (
          <p>Creating payment order...</p>
        ) : !order ? (
          <p>No payment order found.</p>
        ) : (
          <>
            <h2>{order.plan.planName}</h2>

            <table className="table">
              <tbody>
                <tr>
                  <th>Category</th>
                  <td>{order.plan.category}</td>
                </tr>
                <tr>
                  <th>Coverage</th>
                  <td>₹{order.plan.coverageAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <th>Yearly Premium</th>
                  <td>₹{order.plan.yearlyPremium.toLocaleString()}</td>
                </tr>
                <tr>
                  <th>Payment Years</th>
                  <td>{order.plan.paymentYears}</td>
                </tr>
                <tr>
                  <th>Amount Payable</th>
                  <td>
                    <b>₹{order.amount.toLocaleString()}</b>
                  </td>
                </tr>
              </tbody>
            </table>

            <button
              className="btn small-btn"
              onClick={startPayment}
              disabled={paying}
              style={{ marginTop: 20 }}
            >
              {paying ? "Processing..." : `Pay ₹${order.amount}`}
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}