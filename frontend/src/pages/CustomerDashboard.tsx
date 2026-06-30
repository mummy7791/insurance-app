import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Customer = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  kycStatus?: string;
};

type Policy = {
  _id: string;
  policyName?: string;
  policyNumber?: string;
  status?: string;
  premiumAmount?: number;
  expiryDate?: string;
};

type Premium = {
  _id: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
};

type Claim = {
  _id: string;
  claimAmount?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
};

type Activity = {
  _id: string;
  activity?: string;
  type?: string;
  createdAt?: string;
};

type Plan = {
  _id: string;
  planName: string;
  category: string;
  coverageAmount: number;
  yearlyPremium: number;
  paymentYears: number;
  description?: string;
  status?: string;
};

type ActivePlan = {
  _id: string;
  planName: string;
  category: string;
  coverageAmount: number;
  yearlyPremium: number;
  paymentYears: number;
  paymentStatus: string;
  policyStatus: string;
  transactionId: string;
  startDate?: string;
  endDate?: string;
};

type DashboardData = {
  customer: Customer;
  policies: Policy[];
  premiums: Premium[];
  claims: Claim[];
  activities: Activity[];
};

const initialData: DashboardData = {
  customer: { _id: "" },
  policies: [],
  premiums: [],
  claims: [],
  activities: [],
};

const normalizeDashboard = (result?: Partial<DashboardData>): DashboardData => ({
  customer: result?.customer || initialData.customer,
  policies: Array.isArray(result?.policies) ? result.policies : [],
  premiums: Array.isArray(result?.premiums) ? result.premiums : [],
  claims: Array.isArray(result?.claims) ? result.claims : [],
  activities: Array.isArray(result?.activities) ? result.activities : [],
});

export default function CustomerDashboard() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState("");

  const fetchDashboard = useCallback(async (): Promise<DashboardData> => {
    const res = await api.get<DashboardData>("/customer-dashboard");
    return normalizeDashboard(res.data);
  }, []);

  const fetchPlans = useCallback(async (): Promise<Plan[]> => {
    const res = await api.get<Plan[]>("/plans");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const fetchActivePlans = useCallback(async (): Promise<ActivePlan[]> => {
    const res = await api.get<ActivePlan[]>("/plan-purchases/my-plans");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [dashboardResult, plansResult, activePlanResult] = await Promise.all([
        fetchDashboard(),
        fetchPlans(),
        fetchActivePlans(),
      ]);

      setData(dashboardResult);
      setPlans(plansResult);
      setActivePlans(activePlanResult);
    } catch (error) {
      console.error("Customer dashboard load error:", error);
      setData(initialData);
      setPlans([]);
      setActivePlans([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchPlans, fetchActivePlans]);

  useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadDashboard();
  }, 0);

  return () => window.clearTimeout(timer);
}, [loadDashboard]);

  const isAlreadyBought = (planId: string, planName: string) => {
    return activePlans.some(
      (item) => item._id === planId || item.planName === planName
    );
  };

  const buyPlan = async (planId: string) => {
    try {
      setBuyingId(planId);

      await api.post("/plan-purchases/buy", {
        planId,
      });

      alert("Plan purchased successfully!");
      await loadDashboard();
    } catch (error) {
      console.error("Buy plan error:", error);
      alert("Plan buy failed. Please try again.");
    } finally {
      setBuyingId("");
    }
  };

  return (
    <MainLayout
      title="Customer Dashboard"
      subtitle="Customer profile, available plans, active plans, policies, premiums, claims and activities"
    >
      {loading && <p>Loading customer dashboard...</p>}

      <div className="cards">
        <div className="card">
          <h3>Customer</h3>
          <h1>{data.customer.name || "N/A"}</h1>
          <p>{data.customer.email || "N/A"}</p>
        </div>

        <div className="card">
          <h3>Available Plans</h3>
          <h1>{plans.length}</h1>
        </div>

        <div className="card">
          <h3>Active Plans</h3>
          <h1>{activePlans.length}</h1>
        </div>

        <div className="card">
          <h3>Policies</h3>
          <h1>{data.policies.length}</h1>
        </div>

        <div className="card">
          <h3>Premiums</h3>
          <h1>{data.premiums.length}</h1>
        </div>

        <div className="card">
          <h3>KYC Status</h3>
          <h1>{data.customer.kycStatus || "Pending"}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Available Plans</h2>

        {plans.length === 0 ? (
          <p>No plans available.</p>
        ) : (
          <div className="lead-grid">
            {plans.map((plan) => {
              const bought = isAlreadyBought(plan._id, plan.planName);

              return (
                <div className="lead-card" key={plan._id}>
                  <h3>{plan.planName}</h3>

                  <p>
                    <b>Category:</b> {plan.category || "N/A"}
                  </p>

                  <p>
                    <b>Coverage:</b> ₹
                    {Number(plan.coverageAmount || 0).toLocaleString("en-IN")}
                  </p>

                  <p>
                    <b>Yearly Premium:</b> ₹
                    {Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}
                  </p>

                  <p>
                    <b>Payment Years:</b> {plan.paymentYears || 1}
                  </p>

                  <p>
                    <b>Description:</b> {plan.description || "N/A"}
                  </p>

                  <button
                    className="btn small-btn"
                    disabled={bought || buyingId === plan._id}
                    onClick={() => void buyPlan(plan._id)}
                  >
                    {bought
                      ? "Already Bought"
                      : buyingId === plan._id
                      ? "Buying..."
                      : "Buy Plan"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="section">
        <h2>My Active Plans</h2>

        {activePlans.length === 0 ? (
          <p>No active plans found.</p>
        ) : (
          <div className="lead-grid">
            {activePlans.map((plan) => (
              <div className="lead-card" key={plan._id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <h3>{plan.planName}</h3>

                  <span
                    style={{
                      background:
                        plan.policyStatus === "Active" ? "#16a34a" : "#dc2626",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontWeight: 700,
                    }}
                  >
                    ● {plan.policyStatus}
                  </span>
                </div>

                <p>
                  <b>Category:</b> {plan.category}
                </p>

                <p>
                  <b>Coverage:</b> ₹
                  {Number(plan.coverageAmount || 0).toLocaleString("en-IN")}
                </p>

                <p>
                  <b>Yearly Premium:</b> ₹
                  {Number(plan.yearlyPremium || 0).toLocaleString("en-IN")}
                </p>

                <p>
                  <b>Payment Years:</b> {plan.paymentYears || 1}
                </p>

                <p>
                  <b>Payment Status:</b>{" "}
                  <span
                    style={{
                      color:
                        plan.paymentStatus === "Paid" ? "#16a34a" : "#dc2626",
                      fontWeight: 700,
                    }}
                  >
                    {plan.paymentStatus}
                  </span>
                </p>

                <p>
                  <b>Transaction ID:</b>
                  <br />
                  {plan.transactionId || "N/A"}
                </p>

                <p>
                  <b>Start:</b>{" "}
                  {plan.startDate
                    ? new Date(plan.startDate).toLocaleDateString()
                    : "N/A"}
                </p>

                <p>
                  <b>Expiry:</b>{" "}
                  {plan.endDate
                    ? new Date(plan.endDate).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2>Customer Profile</h2>

        <table className="table">
          <tbody>
            <tr>
              <th>Name</th>
              <td>{data.customer.name || "N/A"}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{data.customer.email || "N/A"}</td>
            </tr>
            <tr>
              <th>Phone</th>
              <td>{data.customer.phone || "N/A"}</td>
            </tr>
            <tr>
              <th>Address</th>
              <td>{data.customer.address || "N/A"}</td>
            </tr>
            <tr>
              <th>KYC</th>
              <td>
                <span className="badge">
                  {data.customer.kycStatus || "Pending"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>My Policies</h2>

        {data.policies.length === 0 ? (
          <p>No policies found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Number</th>
                <th>Status</th>
                <th>Premium</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {data.policies.map((policy) => (
                <tr key={policy._id}>
                  <td>{policy.policyName || "N/A"}</td>
                  <td>{policy.policyNumber || "N/A"}</td>
                  <td>
                    <span className="badge">{policy.status || "N/A"}</span>
                  </td>
                  <td>₹{policy.premiumAmount || 0}</td>
                  <td>
                    {policy.expiryDate
                      ? new Date(policy.expiryDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Premium History</h2>

        {data.premiums.length === 0 ? (
          <p>No premiums found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.premiums.map((premium) => (
                <tr key={premium._id}>
                  <td>₹{premium.amount || 0}</td>
                  <td>
                    <span className="badge">{premium.status || "N/A"}</span>
                  </td>
                  <td>
                    {premium.dueDate
                      ? new Date(premium.dueDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    {premium.createdAt
                      ? new Date(premium.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Claims</h2>

        {data.claims.length === 0 ? (
          <p>No claims found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.claims.map((claim) => (
                <tr key={claim._id}>
                  <td>₹{claim.claimAmount || 0}</td>
                  <td>{claim.reason || "N/A"}</td>
                  <td>
                    <span className="badge">{claim.status || "N/A"}</span>
                  </td>
                  <td>
                    {claim.createdAt
                      ? new Date(claim.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Recent Activities</h2>

        {data.activities.length === 0 ? (
          <p>No activities found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.activities.map((item) => (
                <tr key={item._id}>
                  <td>{item.activity || "N/A"}</td>
                  <td>
                    <span className="badge">{item.type || "Other"}</span>
                  </td>
                  <td>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        className="btn small-btn"
        onClick={() => void loadDashboard()}
        disabled={loading}
      >
        Refresh
      </button>
    </MainLayout>
  );
}