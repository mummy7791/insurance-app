import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";
import jsPDF from "jspdf";

type PaymentMode = "UPI" | "Cash" | "Card" | "Net Banking";
type PremiumStatus = "Due" | "Paid" | "Overdue";

type Premium = {
  _id: string;
  customerName: string;
  policyNumber: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paymentMode: PaymentMode;
  receiptNumber?: string;
  status: PremiumStatus;
};

type PremiumForm = {
  customerName: string;
  policyNumber: string;
  amount: string;
  dueDate: string;
  paymentMode: PaymentMode;
  receiptNumber: string;
};

const initialForm: PremiumForm = {
  customerName: "",
  policyNumber: "",
  amount: "",
  dueDate: "",
  paymentMode: "UPI",
  receiptNumber: "",
};

export default function Premiums() {
  const [premiums, setPremiums] = useState<Premium[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PremiumForm>(initialForm);
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("insuranceUser") || "{}"); } catch { return {}; } }, []);
  const isCustomer = user.role === "customer" || !user.role;

  const loadPremiums = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Premium[]>("/premiums");

      setTimeout(() => {
        setPremiums(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Premiums load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Premiums load failed");
    }
  }, []);

  useEffect(() => {
    void loadPremiums();
  }, [loadPremiums]);

  const addPremium = async () => {
    if (!form.customerName || !form.policyNumber || !form.amount || !form.dueDate) {
      alert("Customer Name, Policy Number, Amount, Due Date required");
      return;
    }

    try {
      const res = await api.post<Premium>("/premiums", {
        customerName: form.customerName,
        policyNumber: form.policyNumber,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        paymentMode: form.paymentMode,
        receiptNumber:
          form.receiptNumber || `REC${Math.floor(Math.random() * 1000000)}`,
        status: "Due",
      });

      setPremiums((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Premium add error:", error);
      alert("Premium add failed");
    }
  };

  const updateStatus = async (id: string, status: PremiumStatus) => {
    try {
      const payload =
        status === "Paid"
          ? {
              status,
              paidDate: new Date().toISOString().split("T")[0],
            }
          : {
              status,
              paidDate: "",
            };

      const res = await api.put<Premium>(`/premiums/${id}`, payload);

      setPremiums((prev) =>
        prev.map((premium) => (premium._id === id ? res.data : premium))
      );
    } catch (error) {
      console.error("Premium status update error:", error);
      alert("Premium status update failed");
    }
  };

  const deletePremium = async (id: string) => {
    const ok = window.confirm("Delete this premium record?");
    if (!ok) return;

    try {
      await api.delete(`/premiums/${id}`);
      setPremiums((prev) => prev.filter((premium) => premium._id !== id));
    } catch (error) {
      console.error("Premium delete error:", error);
      alert("Premium delete failed");
    }
  };

  const downloadReceipt = (premium: Premium) => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("SecureLife Insurance", 20, 24);
    doc.setFontSize(13); doc.text("Premium Payment Receipt", 20, 36);
    doc.setFontSize(11);
    const rows = [
      `Receipt Number: ${premium.receiptNumber || "N/A"}`,
      `Policy Number: ${premium.policyNumber}`,
      `Policyholder: ${premium.customerName}`,
      `Amount Paid: INR ${Number(premium.amount || 0).toLocaleString("en-IN")}`,
      `Payment Mode: ${premium.paymentMode}`,
      `Paid Date: ${premium.paidDate || "N/A"}`,
      `Status: ${premium.status}`,
    ];
    rows.forEach((row, i) => doc.text(row, 20, 54 + i * 9));
    doc.setFontSize(9);
    doc.text("Digitally generated receipt from your SecureLife customer account.", 20, 126);
    doc.save(`${premium.receiptNumber || premium.policyNumber}-receipt.pdf`);
  };

  const totalCollected = premiums
    .filter((premium) => premium.status === "Paid")
    .reduce((sum, premium) => sum + premium.amount, 0);

  const dueAmount = premiums
    .filter((premium) => premium.status === "Due" || premium.status === "Overdue")
    .reduce((sum, premium) => sum + premium.amount, 0);

  return (
    <MainLayout
      title={isCustomer ? "Premiums & Payments" : "Premium Collection"}
      subtitle={isCustomer ? "View upcoming premiums and your payment history" : "Track due, paid and overdue premium payments"}
    >
      {!isCustomer && <div className="admin-page-summary"><div><span className="eyebrow">COLLECTION OPERATIONS</span><h2>Premium collection workspace</h2><p>Track upcoming dues, paid premiums and overdue collections across active policies.</p></div><div className="admin-summary-metrics"><div><span>Records</span><strong>{premiums.length}</strong></div><div><span>Paid</span><strong>{premiums.filter((p) => p.status === "Paid").length}</strong></div><div><span>Overdue</span><strong>{premiums.filter((p) => p.status === "Overdue").length}</strong></div></div></div>}
      <div className={`cards ${!isCustomer ? "admin-kpi-grid" : ""}`}>
        <div className="card">
          <h3>Total Collected</h3>
          <h1>₹{Number(totalCollected || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Due Amount</h3>
          <h1>₹{Number(dueAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Paid Records</h3>
          <h1>{premiums.filter((p) => p.status === "Paid").length}</h1>
        </div>

        <div className="card">
          <h3>Total Records</h3>
          <h1>{premiums.length}</h1>
        </div>
      </div>

{!isCustomer && (
      <div className="section">
        <span className="eyebrow">NEW COLLECTION</span><h2>Add premium due</h2><p className="section-copy">Create a premium schedule entry for an existing customer policy.</p>
        <div className="form-grid">
          <input placeholder="Customer Name" value={form.customerName} onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))} />
          <input placeholder="Policy Number" value={form.policyNumber} onChange={(e) => setForm((prev) => ({ ...prev, policyNumber: e.target.value }))} />
          <input placeholder="Amount" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
          <input type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          <select value={form.paymentMode} onChange={(e) => setForm((prev) => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}>
            <option value="UPI">UPI</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Net Banking">Net Banking</option>
          </select>
          <input placeholder="Receipt Number optional" value={form.receiptNumber} onChange={(e) => setForm((prev) => ({ ...prev, receiptNumber: e.target.value }))} />
        </div>
        <button className="btn small-btn" onClick={addPremium}>Add Premium</button>
      </div>
      )}

      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">PAYMENT HISTORY</span><h2>{isCustomer ? "My Premiums" : "Premium register"}</h2></div>{isCustomer ? <span className="secure-chip">Receipts verified</span> : <span className="secure-chip">{premiums.length} records</span>}</div>

        <button className="mini-btn" onClick={loadPremiums}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : premiums.length === 0 ? (
          <p>No premium records found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy No</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Mode</th>
                <th>Receipt</th>
                <th>Status</th>
                {isCustomer && <th>Receipt PDF</th>}
                {!isCustomer && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {premiums.map((premium) => (
                <tr key={premium._id}>
                  <td>{premium.customerName}</td>
                  <td>{premium.policyNumber}</td>
                  <td><strong>₹{Number(premium.amount || 0).toLocaleString("en-IN")}</strong></td>
                  <td>{premium.dueDate}</td>
                  <td>{premium.paidDate || "-"}</td>
                  <td>{premium.paymentMode}</td>
                  <td>{premium.receiptNumber || "-"}</td>
                  <td>{isCustomer ? <span className={`status-pill ${premium.status === "Overdue" ? "overdue" : premium.status === "Due" ? "due" : "active"}`}>{premium.status}</span> : (
                    <select className="status-select" value={premium.status} onChange={(e) => updateStatus(premium._id, e.target.value as PremiumStatus)}>
                      <option value="Due">Due</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option>
                    </select>
                  )}</td>
                  {isCustomer && <td>{premium.status === "Paid" ? <button className="mini-btn" onClick={() => downloadReceipt(premium)}>Download</button> : "-"}</td>}
                  {!isCustomer && <td><button className="mini-btn danger-btn" onClick={() => deletePremium(premium._id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}