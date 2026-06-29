import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type FollowStatus = "Scheduled" | "Completed" | "Missed";

type FollowType =
  | "Call"
  | "Meeting"
  | "Premium Reminder"
  | "Policy Discussion"
  | "KYC";

type FollowUp = {
  _id: string;
  customerName: string;
  phone: string;
  followType: FollowType;
  date: string;
  time: string;
  status: FollowStatus;
  remarks: string;
};

type FollowForm = {
  customerName: string;
  phone: string;
  followType: FollowType;
  date: string;
  time: string;
  remarks: string;
};

const initialForm: FollowForm = {
  customerName: "",
  phone: "",
  followType: "Call",
  date: "",
  time: "",
  remarks: "",
};

export default function Calendar() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [form, setForm] = useState<FollowForm>(initialForm);
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFollowups = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<FollowUp[]>("/followups");

      setTimeout(() => {
        setFollowups(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Followups load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Followups load failed");
    }
  }, []);

  useEffect(() => {
    void loadFollowups();
  }, [loadFollowups]);

  const addFollowUp = async () => {
    if (!form.customerName || !form.phone || !form.date || !form.time) {
      alert("Customer Name, Phone, Date, Time required");
      return;
    }

    try {
      const res = await api.post<FollowUp>("/followups", {
        customerName: form.customerName,
        phone: form.phone,
        followType: form.followType,
        date: form.date,
        time: form.time,
        remarks: form.remarks || "No remarks",
      });

      setFollowups((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Followup add error:", error);
      alert("Followup add failed");
    }
  };

  const updateStatus = async (id: string, status: FollowStatus) => {
    try {
      const res = await api.put<FollowUp>(`/followups/${id}`, {
        status,
      });

      setFollowups((prev) =>
        prev.map((item) => (item._id === id ? res.data : item))
      );
    } catch (error) {
      console.error("Followup status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteFollowUp = async (id: string) => {
    const ok = window.confirm("Delete this follow-up?");
    if (!ok) return;

    try {
      await api.delete(`/followups/${id}`);
      setFollowups((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Followup delete error:", error);
      alert("Followup delete failed");
    }
  };

  const filteredFollowups = useMemo(() => {
    if (!filterDate) return followups;
    return followups.filter((item) => item.date === filterDate);
  }, [followups, filterDate]);

  return (
    <MainLayout
      title="Follow-up Calendar"
      subtitle="Schedule calls, meetings, premium reminders and KYC tasks"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Follow-ups</h3>
          <h1>{followups.length}</h1>
        </div>

        <div className="card">
          <h3>Scheduled</h3>
          <h1>{followups.filter((f) => f.status === "Scheduled").length}</h1>
        </div>

        <div className="card">
          <h3>Completed</h3>
          <h1>{followups.filter((f) => f.status === "Completed").length}</h1>
        </div>

        <div className="card">
          <h3>Missed</h3>
          <h1>{followups.filter((f) => f.status === "Missed").length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Add Follow-up</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.customerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerName: e.target.value }))
            }
          />

          <input
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
          />

          <select
            value={form.followType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                followType: e.target.value as FollowType,
              }))
            }
          >
            <option value="Call">Call</option>
            <option value="Meeting">Meeting</option>
            <option value="Premium Reminder">Premium Reminder</option>
            <option value="Policy Discussion">Policy Discussion</option>
            <option value="KYC">KYC</option>
          </select>

          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, date: e.target.value }))
            }
          />

          <input
            type="time"
            value={form.time}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, time: e.target.value }))
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

        <button className="btn small-btn" onClick={addFollowUp}>
          Add Follow-up
        </button>
      </div>

      <div className="section">
        <h2>Follow-up List</h2>

        <button className="mini-btn" onClick={loadFollowups}>
          Refresh
        </button>

        <div className="form-grid">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />

          <button className="mini-btn" onClick={() => setFilterDate("")}>
            Clear Filter
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredFollowups.length === 0 ? (
          <p>No follow-ups found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredFollowups.map((item) => (
                <tr key={item._id}>
                  <td>{item.customerName}</td>
                  <td>{item.phone}</td>
                  <td>{item.followType}</td>
                  <td>{item.date}</td>
                  <td>{item.time}</td>
                  <td>
                    <select
                      className="status-select"
                      value={item.status}
                      onChange={(e) =>
                        updateStatus(item._id, e.target.value as FollowStatus)
                      }
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>
                  <td>{item.remarks}</td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteFollowUp(item._id)}
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