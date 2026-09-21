import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type OrderResponse = {
  orderId: string;
  paymentSessionId: string;
  amount: number;
  currency: string;
  gateway: "cashfree";
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

type CashfreeCheckoutResult = {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
};

type CashfreeInstance = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget: "_self" | "_blank" | "_top";
  }) => Promise<CashfreeCheckoutResult>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "production" | "sandbox" }) => CashfreeInstance;
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
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
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

          const params = new URLSearchParams(window.location.search);
          const returnedOrderId = params.get("cf_order_id");

          if (returnedOrderId) {
            if (active) {
              setLoading(false);
              await verifyPayment(returnedOrderId);
            }
            return;
          }

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
            alert("Proposal data is invalid. Please complete it again.");
            navigate(`/online-policy-purchase?plan=${planId}`, { replace: true });
            return;
          }
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

  const verifyPayment = async (orderId: string) => {
    if (!planId) return;

    try {
      setPaying(true);

      const verified = await api.post<{
        confirmation: {
          policyNumber: string;
          receiptNumber: string;
          transactionId: string;
        };
      }>("/plan-purchases/verify-payment", {
        planId,
        orderId,
      });

      setConfirmation(verified.data.confirmation);
      setCheckoutError("");
      sessionStorage.removeItem(`proposal:${planId}`);
      sessionStorage.removeItem("premiumEstimate");
    } catch (error: unknown) {
      setCheckoutError(
        getErrorMessage(
          error,
          "Payment verification failed. If money was debited, do not pay again until the payment status is checked."
        )
      );
    } finally {
      setPaying(false);
    }
  };

  const startPayment = async () => {
    if (!order || !planId) {
      alert("Order not ready");
      return;
    }

    if (!window.Cashfree) {
      setCheckoutError("Cashfree checkout is still loading. Please refresh and try again.");
      return;
    }

    setCheckoutError("");
    setPaying(true);

    try {
      const cashfree = window.Cashfree({ mode: "production" });
      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_self",
      });

      if (result?.error) {
        setCheckoutError(result.error.message || "Payment could not be started.");
        setPaying(false);
      }
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Payment could not be started. Please try again."
      );
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

            {checkoutError && <div className="checkout-inline-error" role="alert">{checkoutError}</div>}

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