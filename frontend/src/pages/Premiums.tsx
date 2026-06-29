import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

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

  const totalCollected = premiums
    .filter((premium) => premium.status === "Paid")
    .reduce((sum, premium) => sum + premium.amount, 0);

  const dueAmount = premiums
    .filter((premium) => premium.status === "Due" || premium.status === "Overdue")
    .reduce((sum, premium) => sum + premium.amount, 0);

  return (
    <MainLayout
      title="Premium Collection"
      subtitle="Track due, paid and overdue premium payments"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Collected</h3>
          <h1>₹{totalCollected}</h1>
        </div>

        <div className="card">
          <h3>Due Amount</h3>
          <h1>₹{dueAmount}</h1>
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

      <div className="section">
        <h2>Add Premium Due</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.customerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerName: e.target.value }))
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
            placeholder="Amount"
            value={form.amount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, amount: e.target.value }))
            }
          />

          <input
            type="date"
            value={form.dueDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dueDate: e.target.value }))
            }
          />

          <select
            value={form.paymentMode}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                paymentMode: e.target.value as PaymentMode,
              }))
            }
          >
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Net Banking">Net Banking</option>
          </select>

          <input
            placeholder="Receipt Number optional"
            value={form.receiptNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, receiptNumber: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addPremium}>
          Add Premium
        </button>
      </div>

      <div className="section">
        <h2>Premium List</h2>

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
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {premiums.map((premium) => (
                <tr key={premium._id}>
                  <td>{premium.customerName}</td>
                  <td>{premium.policyNumber}</td>
                  <td>₹{premium.amount}</td>
                  <td>{premium.dueDate}</td>
                  <td>{premium.paidDate || "-"}</td>
                  <td>{premium.paymentMode}</td>
                  <td>{premium.receiptNumber || "-"}</td>
                  <td>
                    <select
                      className="status-select"
                      value={premium.status}
                      onChange={(e) =>
                        updateStatus(
                          premium._id,
                          e.target.value as PremiumStatus
                        )
                      }
                    >
                      <option value="Due">Due</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deletePremium(premium._id)}
                    >
                      Delete
                    </button>
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