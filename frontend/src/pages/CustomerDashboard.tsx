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

type PolicyPurchase = {
  _id: string;
  policyId: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  sumAssured: number;
  paymentMode: string;
  paidAmount: number;
  paymentStatus: "Pending" | "Paid" | "Failed";
  status: "Pending" | "Approved" | "Rejected" | "Active";
  transactionId?: string;
  createdAt?: string;
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
  const [myPolicies, setMyPolicies] = useState<PolicyPurchase[]>([]);
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
    try {
      const res = await api.get<Policy[]>("/policies");
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.error("Available policies load error:", error);
      return [];
    }
  }, []);

  const fetchMyPolicies = useCallback(async (): Promise<PolicyPurchase[]> => {
    try {
      const res = await api.get<PolicyPurchase[]>("/policy-purchases/my-policies");
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.error("My policies load error:", error);
      return [];
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [dashboardResult, policiesResult, myPoliciesResult] =
        await Promise.all([
          fetchDashboard(),
          fetchAvailablePolicies(),
          fetchMyPolicies(),
        ]);

      setData(dashboardResult);
      setAvailablePolicies(policiesResult);
      setMyPolicies(myPoliciesResult);
    } catch (error) {
      console.error("Customer dashboard load error:", error);
      setData(initialData);
      setAvailablePolicies([]);
      setMyPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchAvailablePolicies, fetchMyPolicies]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const isPolicyBought = (policyId: string) => {
    return myPolicies.some((item) => String(item.policyId) === String(policyId));
  };

  const buyPolicy = async (policyId: string) => {
    try {
      setBuyingId(policyId);

      await api.post(`/policy-purchases/buy/${policyId}`);

      alert("Policy purchased successfully!");
      await loadDashboard();
    } catch (error) {
      console.error("Buy policy error:", error);
      alert("Policy buy failed");
    } finally {
      setBuyingId("");
    }
  };

  const totalPaid = myPolicies.reduce(
    (sum, item) => sum + Number(item.paidAmount || item.premiumAmount || 0),
    0
  );

  return (
    <MainLayout
      title="Customer Dashboard"
      subtitle="Customer profile, available policies, active policies, payments and claims"
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
          <h1>{myPolicies.length}</h1>
        </div>

        <div className="card">
          <h3>Total Paid</h3>
          <h1>₹{totalPaid.toLocaleString("en-IN")}</h1>
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
            {availablePolicies.map((policy) => {
              const bought = isPolicyBought(policy._id);

              return (
                <div className="lead-card" key={policy._id}>
                  <h3>{policy.policyName}</h3>

                  <p>📄 Policy No: {policy.policyNumber}</p>
                  <p>💰 Premium: ₹{policy.premiumAmount}</p>
                  <p>🛡️ Sum Assured: ₹{policy.sumAssured}</p>
                  <p>📆 Payment Mode: {policy.paymentMode}</p>

                  {bought ? (
                    <span
                      style={{
                        background: "#16a34a",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontWeight: 700,
                      }}
                    >
                      ● Active
                    </span>
                  ) : (
                    <span className="badge">{policy.status}</span>
                  )}

                  <br />
                  <br />

                  <button
                    className="btn small-btn"
                    disabled={bought || buyingId === policy._id}
                    onClick={() => void buyPolicy(policy._id)}
                  >
                    {bought
                      ? "Already Bought"
                      : buyingId === policy._id
                      ? "Buying..."
                      : "Buy Policy"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="section">
        <h2>My Active Policies</h2>

        {myPolicies.length === 0 ? (
          <p>No active policies found.</p>
        ) : (
          <div className="lead-grid">
            {myPolicies.map((policy) => (
              <div className="lead-card" key={policy._id}>
                <h3>{policy.policyName}</h3>

                <span
                  style={{
                    background: "#16a34a",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}
                >
                  ● {policy.status || "Active"}
                </span>

                <p>📄 Policy No: {policy.policyNumber}</p>
                <p>💰 Premium: ₹{policy.premiumAmount}</p>
                <p>✅ Paid Amount: ₹{policy.paidAmount || policy.premiumAmount}</p>
                <p>🛡️ Sum Assured: ₹{policy.sumAssured}</p>
                <p>📆 Payment Mode: {policy.paymentMode}</p>
                <p>💳 Payment Status: {policy.paymentStatus || "Paid"}</p>
                <p>🧾 Transaction ID: {policy.transactionId || "N/A"}</p>
                <p>
                  📅 Bought Date:{" "}
                  {policy.createdAt
                    ? new Date(policy.createdAt).toLocaleDateString()
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