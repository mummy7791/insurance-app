import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type Advisor = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  advisorCode?: string;
  address?: string;
  role: string;
  status?: "active" | "blocked";
  createdAt?: string;
};

export default function Employees() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadAdvisors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<Advisor[]>("/user-management");
      setAdvisors(res.data.filter((item) => item.role === "advisor"));
    } catch (error) {
      console.error("Advisor directory load error:", error);
      alert("Advisor directory load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAdvisors(); }, [loadAdvisors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return advisors;
    return advisors.filter((a) =>
      `${a.name} ${a.email} ${a.phone || ""} ${a.advisorCode || ""} ${a.address || ""}`
        .toLowerCase().includes(q)
    );
  }, [advisors, search]);

  return (
    <MainLayout title="Advisor Team" subtitle="Advisor profiles, contact details and access status">
      <div className="admin-page-summary">
        <div><span className="eyebrow">ADVISOR NETWORK</span><h2>Advisor directory</h2><p>Only advisor profiles are shown here. Create login access from User Access.</p></div>
        <div className="admin-summary-metrics">
          <div><span>Total</span><strong>{advisors.length}</strong></div>
          <div><span>Active</span><strong>{advisors.filter((a) => a.status !== "blocked").length}</strong></div>
          <div><span>Blocked</span><strong>{advisors.filter((a) => a.status === "blocked").length}</strong></div>
        </div>
      </div>

      <div className="section admin-table-section">
        <div className="section-heading-row">
          <div><span className="eyebrow">TEAM</span><h2>Advisors</h2></div>
          <button className="mini-btn" onClick={() => void loadAdvisors()}>Refresh</button>
        </div>
        <div className="admin-search-bar">
          <input placeholder="Search name, code, phone, email or address" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span>{filtered.length} advisors</span>
        </div>

        {loading ? <p>Loading advisors...</p> : filtered.length === 0 ? <p>No advisors found. Create an advisor from User Access.</p> : (
          <div className="premium-table-wrap">
            <table className="table advisor-table">
              <thead><tr><th>Advisor</th><th>Code</th><th>Phone</th><th>Email</th><th>Address</th><th>Status</th></tr></thead>
              <tbody>{filtered.map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.name}</strong></td>
                  <td>{a.advisorCode || "—"}</td>
                  <td>{a.phone || "—"}</td>
                  <td>{a.email}</td>
                  <td>{a.address || "—"}</td>
                  <td><span className="badge">{a.status === "blocked" ? "Blocked" : "Active"}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
