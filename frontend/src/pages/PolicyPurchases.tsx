import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type PolicyPurchase = {
  _id: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  paidAmount: number;
  sumAssured: number;
  paymentMode: string;
  paymentStatus: string;
  status: string;
  transactionId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt?: string;
};

export default function PolicyPurchases() {
  const [purchases, setPurchases] = useState<PolicyPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<PolicyPurchase[]>("/policy-purchases");
      setPurchases(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Policy purchases load error:", error);
      alert("Policy purchases load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPurchases();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPurchases]);

  const totalPaid = purchases.reduce(
    (sum, item) => sum + Number(item.paidAmount || item.premiumAmount || 0),
    0
  );

  return (
    <MainLayout title="Policy Purchases" subtitle="Customer bought policies and payments">
      <div className="cards">
        <div className="card">
          <h3>Total Purchases</h3>
          <h1>{purchases.length}</h1>
        </div>

        <div className="card">
          <h3>Total Paid</h3>
          <h1>₹{totalPaid.toLocaleString("en-IN")}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Customer Purchased Policies</h2>

        <button className="mini-btn" onClick={() => void loadPurchases()}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : purchases.length === 0 ? (
          <p>No policy purchases found.</p>
        ) : (
          <div className="lead-grid">
            {purchases.map((item) => (
              <div className="lead-card" key={item._id}>
                <h3>{item.policyName}</h3>

                <span
                  style={{
                    background: item.status === "Active" ? "#16a34a" : "#f59e0b",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}
                >
                  ● {item.status}
                </span>

                <p>👤 Customer: {item.customerName}</p>
                <p>📧 Email: {item.customerEmail}</p>
                <p>📞 Phone: {item.customerPhone}</p>
                <p>📄 Policy No: {item.policyNumber}</p>
                <p>💰 Premium: ₹{item.premiumAmount}</p>
                <p>✅ Paid Amount: ₹{item.paidAmount || item.premiumAmount}</p>
                <p>🛡️ Sum Assured: ₹{item.sumAssured}</p>
                <p>📆 Payment Mode: {item.paymentMode}</p>
                <p>💳 Payment Status: {item.paymentStatus}</p>
                <p>🧾 Transaction: {item.transactionId || "N/A"}</p>
                <p>
                  📅 Date:{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}