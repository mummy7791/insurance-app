import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKey: string;
  reused?: boolean;
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
  modal?: {
    ondismiss?: () => void;
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
  const [confirmation, setConfirmation] = useState<{ policyNumber: string; receiptNumber: string; transactionId: string } | null>(null);
  const [proposal, setProposal] = useState<{ customerName?: string; customerEmail?: string; customerPhone?: string } | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

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
          setCheckoutError("");

          const proposalRaw = sessionStorage.getItem(`proposal:${planId}`);
          if (!proposalRaw) {
            alert("Please complete your proposal before payment");
            navigate(`/online-policy-purchase?plan=${planId}`, { replace: true });
            return;
          }

          let parsedProposal: Record<string, unknown>;
          try {
            parsedProposal = JSON.parse(proposalRaw) as Record<string, unknown>;
          } catch {
            sessionStorage.removeItem(`proposal:${planId}`);
      sessionStorage.removeItem("premiumEstimate");
      sessionStorage.removeItem("premiumEstimate");
            alert("Proposal data is invalid. Please complete it again.");
            navigate(`/online-policy-purchase?plan=${planId}`, { replace: true });
            return;
          }
          setProposal({
            customerName: String(parsedProposal.customerName || ""),
            customerEmail: String(parsedProposal.customerEmail || ""),
            customerPhone: String(parsedProposal.customerPhone || ""),
          });
          const res = await api.post<OrderResponse>(
            `/plan-purchases/create-order/${planId}`,
            { proposal: parsedProposal }
          );

          if (active) {
            setOrder(res.data);
          }
        } catch (error: unknown) {
          setCheckoutError(getErrorMessage(error, "Unable to prepare secure checkout. Please review your proposal and try again."));
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

    let user: { name?: string; email?: string; phone?: string } = {};
    try {
      user = JSON.parse(localStorage.getItem("insuranceUser") || "{}") as { name?: string; email?: string; phone?: string };
    } catch {
      user = {};
    }

    setPaying(true);

    const options: RazorpayOptions = {
      key: order.razorpayKey,
      amount: order.amount * 100,
      currency: order.currency,
      name: "SecureLife Insurance",
      description: order.plan.planName,
      order_id: order.orderId,
      prefill: {
        name: proposal?.customerName || user.name || "",
        email: proposal?.customerEmail || user.email || "",
        contact: proposal?.customerPhone || user.phone || "",
      },
      theme: {
        color: "#7b1730",
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
      handler: (response) => {
        void verifyPayment(response);
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const verifyPayment = async (response: RazorpayResponse) => {
    if (!planId) return;

    try {
      setPaying(true);

      const verified = await api.post<{ confirmation: { policyNumber: string; receiptNumber: string; transactionId: string } }>("/plan-purchases/verify-payment", {
        planId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      setConfirmation(verified.data.confirmation);
      sessionStorage.removeItem(`proposal:${planId}`);
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
      {confirmation ? (
        <div className="section payment-success">
          <div className="success-mark">✓</div>
          <span className="eyebrow">PAYMENT VERIFIED</span>
          <h2>Your policy is active</h2>
          <p>Your payment was securely verified and your SecureLife policy reference has been generated.</p>
          <div className="confirmation-grid">
            <div><span>Policy Number</span><strong>{confirmation.policyNumber}</strong></div>
            <div><span>Receipt Number</span><strong>{confirmation.receiptNumber}</strong></div>
            <div><span>Transaction ID</span><strong>{confirmation.transactionId}</strong></div>
          </div>
          <div className="success-actions"><button className="btn small-btn" onClick={() => navigate("/policies")}>View My Policies</button><button className="mini-btn" onClick={() => navigate("/customer-dashboard")}>Go to Dashboard</button></div>
        </div>
      ) : (
      <div className="payment-shell">
        <div className="payment-progress"><span className="done">1 Plan</span><span className="done">2 Proposal</span><span className="active">3 Payment</span><span>4 Policy active</span></div>
        <div className="section payment-checkout">
        {loading ? (
          <div className="checkout-loading"><span className="checkout-spinner" /><div><strong>Preparing secure checkout</strong><p>Creating a protected payment order for your selected plan.</p></div></div>
        ) : !order ? (
          <div className="checkout-recovery"><strong>Checkout needs your attention</strong><p>{checkoutError || "No payment order found."}</p><button className="btn small-btn" onClick={() => navigate(planId ? `/online-policy-purchase?plan=${planId}` : "/insurance-plans")}>Review proposal</button></div>
        ) : (
          <>
            <div className="checkout-heading"><div><span className="eyebrow">SECURE CHECKOUT</span><h2>{order.plan.planName}</h2><p>Review your cover before continuing to the payment gateway.</p>{order.reused && <small className="order-resumed">Existing secure checkout resumed — no duplicate order created.</small>}</div><div className="secure-payment-badge">Secure payment</div></div>

            <table className="table checkout-table">
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
              {paying ? "Processing..." : `Pay ₹${order.amount.toLocaleString("en-IN")} securely →`}
            </button>
          </>
        )}
        <div className="payment-trust"><span>✓ Server-verified payment</span><span>✓ Instant receipt</span><span>✓ Policy number after successful payment</span></div>
      </div>
      </div>
      )}
    </MainLayout>
  );
}