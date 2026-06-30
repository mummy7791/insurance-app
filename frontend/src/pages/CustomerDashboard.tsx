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
  customerName?: string;
  customerPhone?: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  sumAssured: number;
  paymentMode: "monthly" | "quarterly" | "half_yearly" | "yearly";
  status: "pending" | "active" | "rejected" | "closed" | "expired";
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
  const [availablePolicies, setAvailablePolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState("");

  const fetchDashboard = useCallback(async (): Promise<DashboardData> => {
    try {
      const res = await api.get<DashboardData>("/customer-dashboard");
      return normalizeDashboard(res.data);
    } catch {
      return initialData;
    }
  }, []);

  const fetchAvailablePolicies = useCallback(async (): Promise<Policy[]> => {
    const res = await api.get<Policy[]>("/policies");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [dashboardResult, policiesResult] = await Promise.all([
        fetchDashboard(),
        fetchAvailablePolicies(),
      ]);

      setData(dashboardResult);
      setAvailablePolicies(policiesResult);
    } catch (error) {
      console.error("Customer dashboard load error:", error);
      setData(initialData);
      setAvailablePolicies([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchAvailablePolicies]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const buyPolicy = async (policyId: string) => {
  try {
    setBuyingId(policyId);

    await api.post(`/policies/${policyId}/buy`);

    alert("Policy purchased successfully!");
    await loadDashboard();
  } catch (error) {
    console.error("Buy policy error:", error);
    alert("Policy buy failed");
  } finally {
    setBuyingId("");
  }
};
  return (
    <MainLayout
      title="Customer Dashboard"
      subtitle="Customer profile, available policies, active policies, premiums, claims and activities"
    >
      {loading && <p>Loading customer dashboard...</p>}

      <div className="cards">
        <div className="card">
          <h3>Customer</h3>
          <h1>{data.customer.name || "N/A"}</h1>
          <p>{data.customer.email || "N/A"}</p>
        </div>

        <div className="card">
          <h3>Available Policies</h3>
          <h1>{availablePolicies.length}</h1>
        </div>

        <div className="card">
          <h3>Active Policies</h3>
          <h1>
            {
              availablePolicies.filter((policy) => policy.status === "active")
                .length
            }
          </h1>
        </div>

        <div className="card">
          <h3>Premiums</h3>
          <h1>{data.premiums.length}</h1>
        </div>

        <div className="card">
          <h3>Claims</h3>
          <h1>{data.claims.length}</h1>
        </div>

        <div className="card">
          <h3>KYC Status</h3>
          <h1>{data.customer.kycStatus || "Pending"}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Available Policies</h2>

        {availablePolicies.length === 0 ? (
          <p>No policies available.</p>
        ) : (
          <div className="lead-grid">
            {availablePolicies.map((policy) => (
              <div className="lead-card" key={policy._id}>
                <h3>{policy.policyName}</h3>

                <p>📄 Policy No: {policy.policyNumber}</p>
                <p>💰 Premium: ₹{policy.premiumAmount}</p>
                <p>🛡️ Sum Assured: ₹{policy.sumAssured}</p>
                <p>📆 Payment Mode: {policy.paymentMode}</p>

                <span className="badge">{policy.status}</span>

                <br />
                <br />

                <button
                  className="btn small-btn"
                  disabled={policy.status === "active" || buyingId === policy._id}
                  onClick={() => void buyPolicy(policy._id)}
                >
                  {policy.status === "active"
                    ? "Already Bought"
                    : buyingId === policy._id
                    ? "Buying..."
                    : "Buy Policy"}
                </button>
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