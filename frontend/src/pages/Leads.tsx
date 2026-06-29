import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

type LeadStatus = "New" | "Follow-up" | "Meeting" | "Converted" | "Lost";

type Lead = {
  _id: string;
  name: string;
  phone: string;
  city: string;
  source: string;
  status: LeadStatus;
  nextFollowUp: string;
};

type LeadForm = {
  name: string;
  phone: string;
  city: string;
  source: string;
  nextFollowUp: string;
};

const initialForm: LeadForm = {
  name: "",
  phone: "",
  city: "",
  source: "Reference",
  nextFollowUp: "",
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("insuranceToken"), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeads() {
      if (!token) return;

      queueMicrotask(() => setLoading(true));

      try {
        const res = await api.get<Lead[]>("/leads", {
          signal: controller.signal,
        });

        queueMicrotask(() => {
          setLeads(res.data);
          setLoading(false);
        });
      } catch (error) {
        console.error("Leads load error:", error);
        queueMicrotask(() => setLoading(false));
      }
    }

    void loadLeads();

    return () => {
      controller.abort();
    };
  }, [token]);

  const addLead = async () => {
    if (!form.name || !form.phone || !form.city) {
      alert("Name, Phone, City required");
      return;
    }

    try {
      const res = await api.post<Lead>("/leads", {
        name: form.name,
        phone: form.phone,
        city: form.city,
        source: form.source,
        nextFollowUp: form.nextFollowUp || "Not scheduled",
      });

      setLeads((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Lead add error:", error);
      alert("Lead add failed");
    }
  };

  const updateStatus = async (id: string, status: LeadStatus) => {
    try {
      const res = await api.put<Lead>(`/leads/${id}`, {
        status,
      });

      setLeads((prev) =>
        prev.map((lead) => (lead._id === id ? res.data : lead))
      );
    } catch (error) {
      console.error("Lead status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads((prev) => prev.filter((lead) => lead._id !== id));
    } catch (error) {
      console.error("Lead delete error:", error);
      alert("Lead delete failed");
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>🛡️ LifeSecure CRM</h2>
        <a href="/dashboard">🏠 Dashboard</a>
        <a href="/leads">📋 Leads</a>
        <a href="/customers">👥 Customers</a>
        <a href="/policies">📑 Policies</a>
        <a href="/premiums">💰 Premiums</a>
        <a href="/commission">💸 Commission</a>
        <a href="/employees">👨‍💼 Employees</a>
        <a href="/claims">🧾 Claims</a>
        <a href="/documents">📂 Documents</a>
        <a href="/calendar">📅 Calendar</a>
        <a href="/reports">📊 Reports</a>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>Leads Management</h2>
            <p>Manage calls, follow-ups, meetings and conversions</p>
          </div>
        </div>

        <div className="section">
          <h2>Add New Lead</h2>

          <div className="form-grid">
            <input
              placeholder="Lead Name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />

            <input
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />

            <input
              placeholder="City"
              value={form.city}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, city: e.target.value }))
              }
            />

            <select
              value={form.source}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, source: e.target.value }))
              }
            >
              <option value="Reference">Reference</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Website">Website</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Social Media">Social Media</option>
            </select>

            <input
              type="date"
              value={form.nextFollowUp}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  nextFollowUp: e.target.value,
                }))
              }
            />
          </div>

          <button className="btn small-btn" onClick={addLead}>
            Add Lead
          </button>
        </div>

        <div className="section">
          <h2>Lead Pipeline</h2>

          {loading ? (
            <p>Loading leads...</p>
          ) : leads.length === 0 ? (
            <p>No leads added yet.</p>
          ) : (
            <div className="lead-grid">
              {leads.map((lead) => (
                <div className="lead-card" key={lead._id}>
                  <h3>{lead.name}</h3>
                  <p>📞 {lead.phone}</p>
                  <p>📍 {lead.city}</p>
                  <p>🔗 Source: {lead.source}</p>
                  <p>📅 Follow-up: {lead.nextFollowUp}</p>

                  <span className="badge">{lead.status}</span>

                  <select
                    className="status-select"
                    value={lead.status}
                    onChange={(e) =>
                      updateStatus(lead._id, e.target.value as LeadStatus)
                    }
                  >
                    <option value="New">New</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>

                  <button
                    className="mini-btn danger-btn"
                    onClick={() => deleteLead(lead._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}