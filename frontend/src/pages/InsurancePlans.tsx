import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Plan = {
  _id: string;
  planName: string;
  category: string;
  yearlyAmount?: number;
  yearlyPremium?: number;
  coverageAmount?: number;
  paymentYears: number;
  eligibleFrom?: string;
  eligibleTo?: string;
  benefits?: string | string[];
  coverage?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  }

  return fallback;
};

export default function InsurancePlans() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState("");

  const fetchPlans = useCallback(async (): Promise<Plan[]> => {
    const res = await api.get<Plan[]>("/insurance-plans");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);

      void fetchPlans()
        .then((data) => {
          if (active) setPlans(data);
        })
        .catch((error: unknown) => {
          alert(getErrorMessage(error, "Plans load failed"));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [fetchPlans]);

  const buyPlan = (planId: string) => {
    const token = localStorage.getItem("insuranceToken");

    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setBuyingId(planId);

    window.setTimeout(() => {
      navigate(`/online-policy-purchase?plan=${planId}`);
      setBuyingId("");
    }, 300);
  };

  const getBenefits = (benefits?: string | string[]) => {
    if (Array.isArray(benefits)) return benefits.join(", ");
    return benefits || "N/A";
  };

  return (
    <MainLayout
      title="Insurance Plans"
      subtitle="Compare protection plans, benefits, coverage and premiums"
    >

      <div className="customer-welcome plan-hero"><div><span className="eyebrow">PROTECT WHAT MATTERS</span><h1>Choose cover with confidence.</h1><p>Compare coverage, premium, eligibility and key benefits before you apply.</p></div><button className="customer-primary-action" onClick={() => navigate("/premium-calculator")}>Estimate Premium →</button></div>

      <div className="section">
        <h2>Plans designed around your protection needs</h2>

        {loading ? (
          <p>Loading...</p>
        ) : plans.length === 0 ? (
          <p>No plans found.</p>
        ) : (
          <div className="insurance-plan-grid">
            {plans.map((plan) => {
              const premium = plan.yearlyPremium || plan.yearlyAmount || 0;

              return (
                <div className="insurance-plan-card" key={plan._id}><span className="plan-category">{plan.category}</span>
                  <h3>{plan.planName}</h3>

                  

                  <p>
                    <b>Life / Benefit Cover:</b> ₹
                    {(plan.coverageAmount || 0).toLocaleString("en-IN")}
                  </p>

                  <p>
                    <b>Premium from:</b> ₹
                    {premium.toLocaleString("en-IN")}
                  </p>

                  <p>
                    <b>Payment Years:</b> {plan.paymentYears || 1}
                  </p>

                  <p>
                    <b>Eligibility:</b> {plan.eligibleFrom || "N/A"} to{" "}
                    {plan.eligibleTo || "N/A"}
                  </p>

                  <p>
                    <b>Benefits:</b> {getBenefits(plan.benefits)}
                  </p>

                  <div className="plan-benefit-box">
                    <span>Key benefits</span>
                    <p>{getBenefits(plan.benefits)}</p>
                  </div>
                  <div className="plan-card-footer"><div><small>Annual premium</small><strong>₹{premium.toLocaleString("en-IN")}</strong></div><div><small>Life cover</small><strong>₹{(plan.coverageAmount || 0).toLocaleString("en-IN")}</strong></div></div>

                  <button
                    className="btn small-btn"
                    onClick={() => buyPlan(plan._id)}
                    disabled={buyingId === plan._id}
                    style={{ marginTop: 12 }}
                  >
                    {buyingId === plan._id ? "Opening..." : "Start proposal →"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}