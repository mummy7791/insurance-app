import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type EmployeeRole =
  | "Agent"
  | "Agency Manager"
  | "Unit Manager"
  | "BM"
  | "Admin";

type CommissionStatus = "Pending" | "Paid";

type Commission = {
  _id: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  customerName: string;
  policyNumber: string;
  premiumAmount: number;
  commissionRate: number;
  commissionAmount: number;
  month: string;
  status: CommissionStatus;
  remarks?: string;
};

type CommissionForm = {
  employeeName: string;
  employeeRole: EmployeeRole;
  customerName: string;
  policyNumber: string;
  premiumAmount: string;
  commissionRate: string;
  month: string;
  remarks: string;
};

const initialForm: CommissionForm = {
  employeeName: "",
  employeeRole: "Agent",
  customerName: "",
  policyNumber: "",
  premiumAmount: "",
  commissionRate: "",
  month: "",
  remarks: "",
};

export default function Commission() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [form, setForm] = useState<CommissionForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | EmployeeRole>("All");
  const [monthFilter, setMonthFilter] = useState("");

  const loadCommissions = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Commission[]>("/commissions");

      setTimeout(() => {
        setCommissions(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Commission load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Commission load failed");
    }
  }, []);

  useEffect(() => {
    void loadCommissions();
  }, [loadCommissions]);

  const addCommission = async () => {
    if (
      !form.employeeName ||
      !form.customerName ||
      !form.policyNumber ||
      !form.premiumAmount ||
      !form.commissionRate ||
      !form.month
    ) {
      alert("Employee, Customer, Policy, Premium, Rate and Month required");
      return;
    }

    const premiumAmount = Number(form.premiumAmount);
    const commissionRate = Number(form.commissionRate);
    const commissionAmount = Math.round((premiumAmount * commissionRate) / 100);

    try {
      const res = await api.post<Commission>("/commissions", {
        employeeName: form.employeeName,
        employeeRole: form.employeeRole,
        customerName: form.customerName,
        policyNumber: form.policyNumber,
        premiumAmount,
        commissionRate,
        commissionAmount,
        month: form.month,
        status: "Pending",
        remarks: form.remarks,
      });

      setCommissions((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Commission add error:", error);
      alert("Commission add failed");
    }
  };

  const updateStatus = async (id: string, status: CommissionStatus) => {
    try {
      const res = await api.put<Commission>(`/commissions/${id}`, {
        status,
      });

      setCommissions((prev) =>
        prev.map((item) => (item._id === id ? res.data : item))
      );
    } catch (error) {
      console.error("Commission status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteCommission = async (id: string) => {
    const ok = window.confirm("Delete this commission?");
    if (!ok) return;

    try {
      await api.delete(`/commissions/${id}`);
      setCommissions((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Commission delete error:", error);
      alert("Commission delete failed");
    }
  };

  const filteredCommissions = useMemo(() => {
    return commissions.filter((item) => {
      const text = `${item.employeeName} ${item.customerName} ${item.policyNumber}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole =
        roleFilter === "All" || item.employeeRole === roleFilter;
      const matchesMonth = !monthFilter || item.month === monthFilter;

      return matchesSearch && matchesRole && matchesMonth;
    });
  }, [commissions, search, roleFilter, monthFilter]);

  const totalCommission = filteredCommissions.reduce(
    (sum, item) => sum + item.commissionAmount,
    0
  );

  const paidCommission = filteredCommissions
    .filter((item) => item.status === "Paid")
    .reduce((sum, item) => sum + item.commissionAmount, 0);

  const pendingCommission = filteredCommissions
    .filter((item) => item.status === "Pending")
    .reduce((sum, item) => sum + item.commissionAmount, 0);

  return (
    <MainLayout
      title="Commission Management"
      subtitle="Track employee commission by policy, premium and month"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Commission</h3>
          <h1>₹{totalCommission}</h1>
        </div>

        <div className="card">
          <h3>Paid</h3>
          <h1>₹{paidCommission}</h1>
        </div>

        <div className="card">
          <h3>Pending</h3>
          <h1>₹{pendingCommission}</h1>
        </div>

        <div className="card">
          <h3>Records</h3>
          <h1>{filteredCommissions.length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Add Commission</h2>

        <div className="form-grid">
          <input
            placeholder="Employee Name"
            value={form.employeeName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, employeeName: e.target.value }))
            }
          />

          <select
            value={form.employeeRole}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                employeeRole: e.target.value as EmployeeRole,
              }))
            }
          >
            <option value="Agent">Agent</option>
            <option value="Agency Manager">Agency Manager</option>
            <option value="Unit Manager">Unit Manager</option>
            <option value="BM">BM</option>
            <option value="Admin">Admin</option>
          </select>

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
            placeholder="Premium Amount"
            value={form.premiumAmount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, premiumAmount: e.target.value }))
            }
          />

          <input
            placeholder="Commission Rate %"
            value={form.commissionRate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, commissionRate: e.target.value }))
            }
          />

          <input
            type="month"
            value={form.month}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, month: e.target.value }))
            }
          />

          <input
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, remarks: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addCommission}>
          Add Commission
        </button>
      </div>

      <div className="section">
        <h2>Commission List</h2>

        <button className="mini-btn" onClick={loadCommissions}>
          Refresh
        </button>

        <div className="form-grid">
          <input
            placeholder="Search employee, customer, policy"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as "All" | EmployeeRole)
            }
          >
            <option value="All">All Roles</option>
            <option value="Agent">Agent</option>
            <option value="Agency Manager">Agency Manager</option>
            <option value="Unit Manager">Unit Manager</option>
            <option value="BM">BM</option>
            <option value="Admin">Admin</option>
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />

          <button className="mini-btn" onClick={() => setMonthFilter("")}>
            Clear Month
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredCommissions.length === 0 ? (
          <p>No commission records found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Customer</th>
                <th>Policy</th>
                <th>Premium</th>
                <th>Rate</th>
                <th>Commission</th>
                <th>Month</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCommissions.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.employeeName}</strong>
                    <br />
                    {item.employeeRole}
                  </td>
                  <td>{item.customerName}</td>
                  <td>{item.policyNumber}</td>
                  <td>₹{item.premiumAmount}</td>
                  <td>{item.commissionRate}%</td>
                  <td>₹{item.commissionAmount}</td>
                  <td>{item.month}</td>
                  <td>
                    <select
                      className="status-select"
                      value={item.status}
                      onChange={(e) =>
                        updateStatus(
                          item._id,
                          e.target.value as CommissionStatus
                        )
                      }
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteCommission(item._id)}
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