import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type TargetStatus = "Pending" | "Achieved" | "In Progress";
type TargetRole = "Agent" | "Agency Manager" | "Unit Manager" | "BM";

type Target = {
  _id: string;
  employee: string;
  role: TargetRole;
  month: string;
  target: number;
  achieved: number;
  status: TargetStatus;
};

type TargetForm = {
  employee: string;
  role: TargetRole;
  month: string;
  target: string;
  achieved: string;
};

const initialForm: TargetForm = {
  employee: "",
  role: "Agent",
  month: "",
  target: "",
  achieved: "",
};

export default function Targets() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [form, setForm] = useState<TargetForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const loadTargets = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Target[]>("/targets");

      setTimeout(() => {
        setTargets(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Targets load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Targets load failed");
    }
  }, []);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const addTarget = async () => {
    if (!form.employee || !form.month || !form.target) {
      alert("Employee, Month, Target required");
      return;
    }

    try {
      const res = await api.post<Target>("/targets", {
        employee: form.employee,
        role: form.role,
        month: form.month,
        target: Number(form.target),
        achieved: Number(form.achieved || 0),
      });

      setTargets((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Target add error:", error);
      alert("Target add failed");
    }
  };

  const updateAchievement = async (item: Target, achieved: number) => {
    try {
      const res = await api.put<Target>(`/targets/${item._id}`, {
        employee: item.employee,
        role: item.role,
        month: item.month,
        target: item.target,
        achieved,
      });

      setTargets((prev) =>
        prev.map((target) => (target._id === item._id ? res.data : target))
      );
    } catch (error) {
      console.error("Target update error:", error);
      alert("Target update failed");
    }
  };

  const deleteTarget = async (id: string) => {
    const ok = window.confirm("Delete this target?");
    if (!ok) return;

    try {
      await api.delete(`/targets/${id}`);
      setTargets((prev) => prev.filter((target) => target._id !== id));
    } catch (error) {
      console.error("Target delete error:", error);
      alert("Target delete failed");
    }
  };

  const totalTarget = useMemo(
    () => targets.reduce((sum, item) => sum + item.target, 0),
    [targets]
  );

  const totalAchieved = useMemo(
    () => targets.reduce((sum, item) => sum + item.achieved, 0),
    [targets]
  );

  const completion =
    totalTarget === 0 ? 0 : Math.round((totalAchieved / totalTarget) * 100);

  return (
    <MainLayout
      title="Target Management"
      subtitle="Assign monthly targets and track achievement"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">PERFORMANCE OPERATIONS</span><h2>Sales target workspace</h2><p>Assign monthly targets, monitor achievement and identify performance gaps across the distribution team.</p></div><div className="admin-summary-metrics"><div><span>Records</span><strong>{targets.length}</strong></div><div><span>Achieved</span><strong>{targets.filter((t) => t.status === "Achieved").length}</strong></div><div><span>Completion</span><strong>{completion}%</strong></div></div></div>
      <div className="cards admin-kpi-grid">
        <div className="card">
          <h3>Total Records</h3>
          <h1>{targets.length}</h1>
        </div>

        <div className="card">
          <h3>Total Target</h3>
          <h1>₹{Number(totalTarget || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Total Achievement</h3>
          <h1>₹{Number(totalAchieved || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Completion</h3>
          <h1>{completion}%</h1>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">NEW PERFORMANCE GOAL</span><h2>Assign target</h2><p className="section-copy">Create a monthly target for a team member and track progress against achievement.</p>

        <div className="form-grid">
          <input
            placeholder="Employee Name"
            value={form.employee}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, employee: e.target.value }))
            }
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                role: e.target.value as TargetRole,
              }))
            }
          >
            <option value="Agent">Agent</option>
            <option value="Agency Manager">Agency Manager</option>
            <option value="Unit Manager">Unit Manager</option>
            <option value="BM">BM</option>
          </select>

          <input
            type="month"
            value={form.month}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, month: e.target.value }))
            }
          />

          <input
            placeholder="Target"
            value={form.target}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, target: e.target.value }))
            }
          />

          <input
            placeholder="Achieved"
            value={form.achieved}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, achieved: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addTarget}>
          Assign Target
        </button>
      </div>

      <div className="section admin-table-section">
        <div className="section-heading-row"><div><span className="eyebrow">TARGET REGISTER</span><h2>Target list</h2></div><button className="mini-btn" onClick={loadTargets}>Refresh</button></div>

        {loading ? (
          <p>Loading...</p>
        ) : targets.length === 0 ? (
          <p>No targets assigned.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Month</th>
                <th>Target</th>
                <th>Achieved</th>
                <th>Status</th>
                <th>Update Achievement</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {targets.map((item) => (
                <tr key={item._id}>
                  <td>{item.employee}</td>
                  <td>{item.role}</td>
                  <td>{item.month}</td>
                  <td>₹{Number(item.target || 0).toLocaleString("en-IN")}</td>
                  <td>₹{Number(item.achieved || 0).toLocaleString("en-IN")}</td>
                  <td>
                    <span className="badge">{item.status}</span>
                  </td>
                  <td>
                    <input
                      style={{ width: 120 }}
                      placeholder="Achieved"
                      defaultValue={item.achieved}
                      onBlur={(e) =>
                        updateAchievement(item, Number(e.target.value || 0))
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteTarget(item._id)}
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