import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

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

type PolicyForm = {
  customerName: string;
  customerPhone: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: string;
  sumAssured: string;
  paymentMode: "monthly" | "quarterly" | "half_yearly" | "yearly";
};

const initialForm: PolicyForm = {
  customerName: "",
  customerPhone: "",
  policyName: "",
  policyNumber: "",
  premiumAmount: "",
  sumAssured: "",
  paymentMode: "monthly",
};

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PolicyForm>(initialForm);

  const loadPolicies = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Policy[]>("/policies");

      setTimeout(() => {
        setPolicies(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Policies load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Policies load failed");
    }
  }, []);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const addPolicy = async () => {
    if (!form.policyName || !form.policyNumber || !form.premiumAmount) {
      alert("Policy Name, Policy Number, Premium required");
      return;
    }

    try {
      const res = await api.post<Policy>("/policies", {
        customerName: form.customerName || "N/A",
        customerPhone: form.customerPhone,
        policyName: form.policyName,
        policyNumber: form.policyNumber,
        premiumAmount: Number(form.premiumAmount),
        sumAssured: Number(form.sumAssured || 0),
        paymentMode: form.paymentMode,
      });

      setPolicies((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Add policy error:", error);
      alert("Policy add failed");
    }
  };

  const updateStatus = async (id: string, status: Policy["status"]) => {
    try {
      const res = await api.put<Policy>(`/policies/${id}`, {
        status,
      });

      setPolicies((prev) =>
        prev.map((policy) => (policy._id === id ? res.data : policy))
      );
    } catch (error) {
      console.error("Policy status update error:", error);
      alert("Status update failed");
    }
  };

  const deletePolicy = async (id: string) => {
    const ok = window.confirm("Delete this policy?");
    if (!ok) return;

    try {
      await api.delete(`/policies/${id}`);

      setPolicies((prev) => prev.filter((policy) => policy._id !== id));
    } catch (error) {
      console.error("Policy delete error:", error);
      alert("Policy delete failed");
    }
  };

  return (
    <MainLayout
      title="Policies"
      subtitle="Create and manage insurance policies"
    >
      <div className="section">
        <h2>Add New Policy</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.customerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerName: e.target.value }))
            }
          />

          <input
            placeholder="Customer Phone"
            value={form.customerPhone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerPhone: e.target.value }))
            }
          />

          <input
            placeholder="Policy Name"
            value={form.policyName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, policyName: e.target.value }))
            }
          />

          <input
            placeholder="Policy Number"
            value={form.policyNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, policyNumber: e.target.value }))
            }
          />

          <input
            placeholder="Premium Amount"
            value={form.premiumAmount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, premiumAmount: e.target.value }))
            }
          />

          <input
            placeholder="Sum Assured"
            value={form.sumAssured}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sumAssured: e.target.value }))
            }
          />

          <select
            value={form.paymentMode}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                paymentMode: e.target.value as PolicyForm["paymentMode"],
              }))
            }
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="half_yearly">Half Yearly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <button className="btn small-btn" onClick={addPolicy}>
          Add Policy
        </button>
      </div>

      <div className="section">
        <h2>Policy List</h2>

        <button className="mini-btn" onClick={loadPolicies}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : policies.length === 0 ? (
          <p>No policies found.</p>
        ) : (
          <div className="lead-grid">
            {policies.map((policy) => (
              <div className="lead-card" key={policy._id}>
                <h3>{policy.policyName}</h3>
                <p>👤 Customer: {policy.customerName || "N/A"}</p>
                <p>📞 Phone: {policy.customerPhone || "N/A"}</p>
                <p>📄 Policy No: {policy.policyNumber}</p>
                <p>💰 Premium: ₹{policy.premiumAmount}</p>
                <p>🛡️ Sum Assured: ₹{policy.sumAssured}</p>
                <p>📆 Mode: {policy.paymentMode}</p>

                <span className="badge">{policy.status}</span>

                <select
                  className="status-select"
                  value={policy.status}
                  onChange={(e) =>
                    updateStatus(policy._id, e.target.value as Policy["status"])
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>

                <button
                  className="mini-btn danger-btn"
                  onClick={() => deletePolicy(policy._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}