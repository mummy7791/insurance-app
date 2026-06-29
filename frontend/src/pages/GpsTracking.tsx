import { useState } from "react";

type VisitStatus = "Started" | "Completed" | "Cancelled";

type Visit = {
  id: number;
  agentName: string;
  customerName: string;
  purpose: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  status: VisitStatus;
};

const initialForm = {
  agentName: "",
  customerName: "",
  purpose: "Customer Visit",
};

export default function GpsTracking() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const captureLocation = () => {
    if (!form.agentName || !form.customerName || !form.purpose) {
      alert("Agent Name, Customer Name, Purpose required");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation not supported in this browser");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const now = new Date();

        const newVisit: Visit = {
          id: Date.now(),
          agentName: form.agentName,
          customerName: form.customerName,
          purpose: form.purpose,
          date: now.toISOString().split("T")[0],
          time: now.toLocaleTimeString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "Started",
        };

        setVisits((prev) => [newVisit, ...prev]);
        setForm(initialForm);
        setLoading(false);
      },
      () => {
        alert("Location permission denied or unavailable");
        setLoading(false);
      }
    );
  };

  const updateStatus = (id: number, status: VisitStatus) => {
    setVisits((prev) =>
      prev.map((visit) => (visit.id === id ? { ...visit, status } : visit))
    );
  };

  const deleteVisit = (id: number) => {
    setVisits((prev) => prev.filter((visit) => visit.id !== id));
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>🛡️ LifeSecure CRM</h2>
        <a href="/dashboard">🏠 Dashboard</a>
        <a href="/gps-tracking">📍 GPS Tracking</a>
        <a href="/calendar">📅 Calendar</a>
        <a href="/leads">📋 Leads</a>
        <a href="/customers">👥 Customers</a>
        <a href="/reports">📊 Reports</a>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>Agent GPS / Field Visit Tracking</h2>
            <p>Capture agent visit location and track customer field visits</p>
          </div>
        </div>

        <div className="cards">
          <div className="card">
            <h3>Total Visits</h3>
            <h1>{visits.length}</h1>
          </div>

          <div className="card">
            <h3>Started</h3>
            <h1>{visits.filter((v) => v.status === "Started").length}</h1>
          </div>

          <div className="card">
            <h3>Completed</h3>
            <h1>{visits.filter((v) => v.status === "Completed").length}</h1>
          </div>

          <div className="card">
            <h3>Cancelled</h3>
            <h1>{visits.filter((v) => v.status === "Cancelled").length}</h1>
          </div>
        </div>

        <div className="section">
          <h2>Capture Visit Location</h2>

          <div className="form-grid">
            <input
              placeholder="Agent Name"
              value={form.agentName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, agentName: e.target.value }))
              }
            />

            <input
              placeholder="Customer Name"
              value={form.customerName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, customerName: e.target.value }))
              }
            />

            <select
              value={form.purpose}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, purpose: e.target.value }))
              }
            >
              <option value="Customer Visit">Customer Visit</option>
              <option value="Premium Collection">Premium Collection</option>
              <option value="KYC Collection">KYC Collection</option>
              <option value="Policy Discussion">Policy Discussion</option>
              <option value="Claim Verification">Claim Verification</option>
            </select>
          </div>

          <button className="btn small-btn" onClick={captureLocation}>
            {loading ? "Capturing..." : "Capture GPS"}
          </button>
        </div>

        <div className="section">
          <h2>Visit History</h2>

          {visits.length === 0 ? (
            <p>No field visits recorded yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Customer</th>
                  <th>Purpose</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.agentName}</td>
                    <td>{visit.customerName}</td>
                    <td>{visit.purpose}</td>
                    <td>{visit.date}</td>
                    <td>{visit.time}</td>
                    <td>
                      <a
                        href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Map
                      </a>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={visit.status}
                        onChange={(e) =>
                          updateStatus(visit.id, e.target.value as VisitStatus)
                        }
                      >
                        <option value="Started">Started</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="mini-btn danger-btn"
                        onClick={() => deleteVisit(visit.id)}
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
      </main>
    </div>
  );
}