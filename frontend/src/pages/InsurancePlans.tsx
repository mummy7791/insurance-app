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

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPlans();
      setPlans(data);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Plans load failed"));
    } finally {
      setLoading(false);
    }
  }, [fetchPlans]);

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

  const seedPlans = async () => {
    try {
      await api.post("/insurance-plans/seed-default");
      alert("Plans created");
      void loadPlans();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Only admin can create plans"));
    }
  };

  const buyPlan = (planId: string) => {
    const token = localStorage.getItem("insuranceToken");

    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setBuyingId(planId);

    window.setTimeout(() => {
      navigate(`/payment/${planId}`);
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
      subtitle="Life, Health and Education Returns Plans"
    >
      <div className="section">
        <button className="btn small-btn" onClick={() => void seedPlans()}>
          Create Default Plans
        </button>
      </div>

      <div className="section">
        <h2>Available Plans</h2>

        {loading ? (
          <p>Loading...</p>
        ) : plans.length === 0 ? (
          <p>No plans found.</p>
        ) : (
          <div className="lead-grid">
            {plans.map((plan) => {
              const premium = plan.yearlyPremium || plan.yearlyAmount || 0;

              return (
                <div className="lead-card" key={plan._id}>
                  <h3>{plan.planName}</h3>

                  <p>
                    <b>Category:</b> {plan.category}
                  </p>

                  <p>
                    <b>Coverage:</b> ₹
                    {(plan.coverageAmount || 0).toLocaleString("en-IN")}
                  </p>

                  <p>
                    <b>Yearly Premium:</b> ₹
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

                  <p>
                    <b>Coverage Details:</b> {plan.coverage || "N/A"}
                  </p>

                  <button
                    className="btn small-btn"
                    onClick={() => buyPlan(plan._id)}
                    disabled={buyingId === plan._id}
                    style={{ marginTop: 12 }}
                  >
                    {buyingId === plan._id ? "Opening Payment..." : "Buy Plan"}
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