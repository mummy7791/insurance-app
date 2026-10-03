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
  const [estimate, setEstimate] = useState<{ category?: string; coverageAmount?: number; yearlyPremium?: number } | null>(null);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  const fetchPlans = useCallback(async (): Promise<Plan[]> => {
    const res = await api.get<Plan[]>("/insurance-plans");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("premiumEstimate");
      if (saved) setEstimate(JSON.parse(saved));
    } catch {
      sessionStorage.removeItem("premiumEstimate");
    }

    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      void fetchPlans()
        .then((data) => {
          if (active) setPlans(data);
        })
        .catch((error: unknown) => {
          if (active) setError(getErrorMessage(error, "Plans load failed"));
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
      navigate("/login");
      return;
    }

    setBuyingId(planId);

    window.setTimeout(() => {
      navigate(`/online-policy-purchase?plan=${planId}`);
      setBuyingId("");
    }, 300);
  };

  const categories = ["All", ...Array.from(new Set(plans.map((plan) => plan.category).filter(Boolean)))];
  const visiblePlans = [...plans]
    .filter((plan) => categoryFilter === "All" || plan.category === categoryFilter)
    .filter((plan) => `${plan.planName} ${plan.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (!estimate?.category) return 0;
      return Number(b.category === estimate.category) - Number(a.category === estimate.category);
    });

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

      {error && <div className="checkout-inline-error" role="alert">{error} <button className="mini-btn" onClick={() => window.location.reload()}>Retry</button></div>}

      {estimate && <div className="estimate-reminder"><div><span className="eyebrow">YOUR PREMIUM ESTIMATE</span><h3>{estimate.category || "Protection plan"}</h3><p>You estimated {estimate.coverageAmount ? `₹${estimate.coverageAmount.toLocaleString("en-IN")} cover` : "your cover"}{estimate.yearlyPremium ? ` at about ₹${estimate.yearlyPremium.toLocaleString("en-IN")} per year` : ""}.</p></div><button className="mini-btn" onClick={() => { sessionStorage.removeItem("premiumEstimate"); setEstimate(null); }}>Dismiss</button></div>}

      <div className="section">
        <div className="plan-browser-heading"><div><span className="eyebrow">EXPLORE PLANS</span><h2>Plans designed around your protection needs</h2><p>Choose a category or search by plan name to find the right proposal faster.</p></div><span className="plan-result-count">{visiblePlans.length} plans</span></div>
        <div className="plan-browser-tools"><input aria-label="Search insurance plans" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plan name or category..." /><div className="plan-category-filters">{categories.map((category) => <button key={category} className={categoryFilter === category ? "active" : ""} onClick={() => setCategoryFilter(category)}>{category}</button>)}</div></div>

        {loading ? (
          <div className="plan-loading-state"><div className="securelife-loading-logo" aria-label="Loading SecureLife plans"><img src="/securelife-logo.jpg" alt="SecureLife Insurance"/><span className="securelife-loading-ring" /></div><strong>Loading protection plans...</strong><span>Please wait while we prepare your plans</span></div>
        ) : plans.length === 0 ? (
          <div className="plan-empty-state"><strong>No insurance plans are available right now.</strong><span>Please check again later or use the premium calculator.</span><button className="mini-btn" onClick={() => navigate("/premium-calculator")}>Premium Calculator</button></div>
        ) : (
          visiblePlans.length === 0 ? <div className="plan-empty-state"><strong>No matching plans found.</strong><span>Try another plan name or category.</span><button className="mini-btn" onClick={() => { setSearch(""); setCategoryFilter("All"); }}>Show all plans</button></div> : <div className="insurance-plan-grid">
            {visiblePlans.map((plan) => {
              const premium = plan.yearlyPremium || plan.yearlyAmount || 0;

              return (
                <div className={`insurance-plan-card ${estimate?.category === plan.category ? "recommended-match" : ""}`} key={plan._id}><div className="plan-label-row"><span className="plan-category">{plan.category}</span>{estimate?.category === plan.category && <span className="estimate-match">Matches estimate</span>}</div>
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