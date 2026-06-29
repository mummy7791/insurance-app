import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Policy = {
  _id: string;
  policyName?: string;
  name?: string;
  policyNumber?: string;
  number?: string;
  status?: string;
  premiumAmount?: number;
  amount?: number;
  premium?: number;
  description?: string;
};

type Purchase = {
  _id: string;
  policyName?: string;
  policyNumber?: string;
  premiumAmount?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

type BuyForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
};

const initialForm: BuyForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  address: "",
};

const getPolicyName = (policy: Policy) => {
  return policy.policyName || policy.name || "Policy";
};

const getPolicyNumber = (policy: Policy) => {
  return policy.policyNumber || policy.number || "N/A";
};

const getPolicyPremium = (policy: Policy) => {
  return Number(policy.premiumAmount || policy.amount || policy.premium || 0);
};

export default function OnlinePolicyPurchase() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<BuyForm>(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [policyRes, purchaseRes] = await Promise.all([
        api.get<Policy[]>("/online-policy"),
        api.get<Purchase[]>("/online-policy/my-purchases"),
      ]);

      setPolicies(Array.isArray(policyRes.data) ? policyRes.data : []);
      setPurchases(Array.isArray(purchaseRes.data) ? purchaseRes.data : []);
    } catch (error) {
      console.error("Online policy load error:", error);
      alert("Online policy load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const text = `${getPolicyName(policy)} ${getPolicyNumber(policy)} ${
        policy.status || ""
      } ${policy.description || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [policies, search]);

  const updateForm = (field: keyof BuyForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openBuy = (policy: Policy) => {
    setSelectedPolicy(policy);

    const savedUser = localStorage.getItem("insuranceUser");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);

        setForm((prev) => ({
          ...prev,
          customerName: user.name || "",
          customerEmail: user.email || "",
        }));
      } catch {
        setForm(initialForm);
      }
    }
  };

  const buyPolicy = async () => {
    if (!selectedPolicy) return;

    if (!form.customerName || !form.customerEmail || !form.customerPhone) {
      alert("Name, email and phone required");
      return;
    }

    try {
      setBuying(true);

      await api.post("/online-policy/buy", {
        policyId: selectedPolicy._id,
        ...form,
      });

      alert("Policy purchase request submitted");

      setSelectedPolicy(null);
      setForm(initialForm);
      void loadData();
    } catch (error) {
      console.error("Buy policy error:", error);
      alert("Policy purchase failed");
    } finally {
      setBuying(false);
    }
  };

  return (
    <MainLayout
      title="Online Policy Purchase"
      subtitle="Browse policies and submit purchase request"
    >
      {loading && <p>Loading policies...</p>}

      <div className="cards">
        <div className="card">
          <h3>Available Policies</h3>
          <h1>{policies.length}</h1>
        </div>

        <div className="card">
          <h3>My Requests</h3>
          <h1>{purchases.length}</h1>
        </div>

        <div className="card">
          <h3>Approved</h3>
          <h1>
            {purchases.filter((item) => item.status === "Approved").length}
          </h1>
        </div>

        <div className="card">
          <h3>Pending</h3>
          <h1>
            {purchases.filter((item) => item.status === "Pending").length}
          </h1>
        </div>
      </div>

      <div className="section">
        <h2>Search Policies</h2>

        <div className="form-grid">
          <input
            placeholder="Search policy name or number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="mini-btn" onClick={() => void loadData()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Available Policies</h2>

        {filteredPolicies.length === 0 ? (
          <p>No policies found.</p>
        ) : (
          <div className="lead-grid">
            {filteredPolicies.map((policy) => (
              <div className="lead-card" key={policy._id}>
                <h3>{getPolicyName(policy)}</h3>
                <p>Policy No: {getPolicyNumber(policy)}</p>
                <p>Premium: ₹{getPolicyPremium(policy)}</p>
                <p>Status: {policy.status || "Active"}</p>
                <p>{policy.description || "No description available."}</p>

                <button
                  className="btn small-btn"
                  onClick={() => openBuy(policy)}
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPolicy && (
        <div className="section">
          <h2>Buy Policy: {getPolicyName(selectedPolicy)}</h2>

          <div className="form-grid">
            <input
              placeholder="Customer Name"
              value={form.customerName}
              onChange={(e) => updateForm("customerName", e.target.value)}
            />

            <input
              placeholder="Customer Email"
              value={form.customerEmail}
              onChange={(e) => updateForm("customerEmail", e.target.value)}
            />

            <input
              placeholder="Customer Phone"
              value={form.customerPhone}
              onChange={(e) => updateForm("customerPhone", e.target.value)}
            />

            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
            />
          </div>

          <div style={{ marginTop: 15 }}>
            <button
              className="btn small-btn"
              onClick={() => void buyPolicy()}
              disabled={buying}
            >
              {buying ? "Submitting..." : "Submit Purchase"}
            </button>

            <button
              className="mini-btn danger-btn"
              onClick={() => setSelectedPolicy(null)}
              style={{ marginLeft: 10 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="section">
        <h2>My Purchase Requests</h2>

        {purchases.length === 0 ? (
          <p>No purchase requests found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Number</th>
                <th>Premium</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {purchases.map((item) => (
                <tr key={item._id}>
                  <td>{item.policyName || "Policy"}</td>
                  <td>{item.policyNumber || "N/A"}</td>
                  <td>₹{item.premiumAmount || 0}</td>
                  <td>
                    <span className="badge">{item.status || "Pending"}</span>
                  </td>
                  <td>
                    <span className="badge">
                      {item.paymentStatus || "Pending"}
                    </span>
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
    </MainLayout>
  );
}