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

type CashfreeInstance = {
  checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "production" | "sandbox" }) => CashfreeInstance;
  }
}

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
  const [payingId, setPayingId] = useState("");
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
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("cf_renewal_order_id");
    const premiumId = params.get("premium_id");

    const verifyReturnedPayment = async () => {
      if (!orderId || !premiumId) {
        await loadPremiums();
        return;
      }
      try {
        setPayingId(premiumId);
        await api.post(`/premiums/${premiumId}/verify-payment`, { orderId });
        window.history.replaceState({}, "", "/premiums");
        await loadPremiums();
        alert("Premium paid successfully. Your receipt is ready.");
      } catch (error) {
        console.error("Renewal verification error:", error);
        alert("Payment verification failed. If money was debited, do not pay again. Refresh and check the premium status.");
      } finally {
        setPayingId("");
      }
    };

    void verifyReturnedPayment();
  }, [loadPremiums]);

  const payPremium = async (premium: Premium) => {
    if (!window.Cashfree) {
      alert("Cashfree checkout is loading. Please try again.");
      return;
    }
    try {
      setPayingId(premium._id);
      const res = await api.post<{ paymentSessionId: string }>(`/premiums/${premium._id}/create-payment-order`);
      const cashfree = window.Cashfree({ mode: "production" });
      const result = await cashfree.checkout({
        paymentSessionId: res.data.paymentSessionId,
        redirectTarget: "_self",
      });
      if (result?.error) {
        alert(result.error.message || "Payment could not be started");
        setPayingId("");
      }
    } catch (error) {
      console.error("Renewal payment start error:", error);
      alert("Renewal payment could not be started");
      setPayingId("");
    }
  };

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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const receiptNo = premium.receiptNumber || "N/A";
    const amount = Number(premium.amount || 0).toLocaleString("en-IN");

    // Professional branded header
    doc.setFillColor(176, 15, 28);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SecureLife Insurance", 16, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Premium Payment Receipt", 16, 25);
    doc.text("Customer Payment Acknowledgement", 16, 31);

    // Receipt reference
    doc.setTextColor(40, 40, 40);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(15, 48, 180, 25, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RECEIPT NUMBER", 21, 57);
    doc.text("PAYMENT STATUS", 138, 57);
    doc.setFontSize(11);
    doc.text(receiptNo, 21, 66);
    doc.setTextColor(20, 130, 70);
    doc.text(premium.status.toUpperCase(), 138, 66);

    doc.setTextColor(35, 35, 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Payment Details", 16, 88);
    doc.setDrawColor(220, 220, 220);
    doc.line(16, 92, 194, 92);

    const details: Array<[string, string]> = [
      ["Policyholder", premium.customerName],
      ["Policy Number", premium.policyNumber],
      ["Premium Amount", `INR ${amount}`],
      ["Payment Mode", premium.paymentMode],
      ["Payment Date", premium.paidDate || "N/A"],
      ["Receipt Number", receiptNo],
    ];
    let y = 103;
    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(label, 20, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(35, 35, 35);
      doc.setFontSize(10);
      doc.text(String(value), 75, y);
      doc.setDrawColor(238, 238, 238);
      doc.line(20, y + 4, 190, y + 4);
      y += 13;
    });

    doc.setFillColor(250, 244, 235);
    doc.roundedRect(16, 188, 178, 30, 3, 3, "F");
    doc.setTextColor(65, 65, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Important", 22, 198);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const note = "This receipt acknowledges the premium payment recorded against the policy shown above. Please retain it with your policy records. Policy benefits remain subject to the policy terms and conditions.";
    doc.text(doc.splitTextToSize(note, 164), 22, 205);

    doc.setTextColor(90, 90, 90);
    doc.setFontSize(8);
    doc.text("This is a system-generated receipt and does not require a physical signature.", 16, 238);
    doc.text("Generated from the SecureLife Insurance customer portal.", 16, 244);

    doc.setDrawColor(176, 15, 28);
    doc.setLineWidth(0.7);
    doc.line(16, 265, 194, 265);
    doc.setTextColor(70, 70, 70);
    doc.setFontSize(8);
    doc.text("SecureLife Insurance | Premium Payment Receipt", 16, 273);
    doc.text("Page 1 of 1", 174, 273);

    doc.save(`${receiptNo}-Premium-Receipt.pdf`);
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
                {isCustomer && <th>Payment / Receipt</th>}
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
                  {isCustomer && <td>{premium.status === "Paid" ? <button className="mini-btn" onClick={() => downloadReceipt(premium)}>Download Receipt</button> : <button className="btn small-btn" disabled={payingId === premium._id} onClick={() => payPremium(premium)}>{payingId === premium._id ? "Opening..." : `Pay ₹${Number(premium.amount || 0).toLocaleString("en-IN")}`}</button>}</td>}
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