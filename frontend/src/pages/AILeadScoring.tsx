import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type LeadCategory = "Hot" | "Warm" | "Cold";

type ScoredLead = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  status?: string;
  source?: string;
  score: number;
  category: LeadCategory;
  createdAt?: string;
};

const getCategoryBadge = (category: LeadCategory) => {
  if (category === "Hot") return "badge danger-badge";
  if (category === "Warm") return "badge warning-badge";
  return "badge";
};

export default function AILeadScoring() {
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | LeadCategory>(
    "All"
  );

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get<ScoredLead[]>("/ai-lead-scoring");
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("AI lead scoring load error:", error);
      alert("AI Lead Scoring load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const text = `${lead.name} ${lead.phone || ""} ${lead.email || ""} ${
        lead.city || ""
      } ${lead.status || ""} ${lead.source || ""}`.toLowerCase();

      const matchSearch = text.includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "All" || lead.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [leads, search, categoryFilter]);

  return (
    <MainLayout
      title="AI Lead Scoring"
      subtitle="Hot, warm and cold lead classification using CRM data"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Leads</h3>
          <h1>{leads.length}</h1>
        </div>

        <div className="card">
          <h3>Hot Leads</h3>
          <h1>{leads.filter((lead) => lead.category === "Hot").length}</h1>
        </div>

        <div className="card">
          <h3>Warm Leads</h3>
          <h1>{leads.filter((lead) => lead.category === "Warm").length}</h1>
        </div>

        <div className="card">
          <h3>Cold Leads</h3>
          <h1>{leads.filter((lead) => lead.category === "Cold").length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Search & Filter</h2>

        <div className="form-grid">
          <input
            placeholder="Search lead name, phone, email, city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "All" | LeadCategory)
            }
          >
            <option value="All">All Leads</option>
            <option value="Hot">Hot Leads</option>
            <option value="Warm">Warm Leads</option>
            <option value="Cold">Cold Leads</option>
          </select>

          <button className="mini-btn" onClick={loadLeads} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Lead Score List</h2>

        {loading ? (
          <p>Loading leads...</p>
        ) : filteredLeads.length === 0 ? (
          <p>No scored leads found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Phone</th>
                <th>City</th>
                <th>Status</th>
                <th>Source</th>
                <th>Score</th>
                <th>Category</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead._id}>
                  <td>
                    <strong>{lead.name}</strong>
                    <br />
                    <small>{lead.email || "N/A"}</small>
                  </td>
                  <td>{lead.phone || "N/A"}</td>
                  <td>{lead.city || "N/A"}</td>
                  <td>{lead.status || "New"}</td>
                  <td>{lead.source || "N/A"}</td>
                  <td>
                    <strong>{lead.score}/100</strong>
                  </td>
                  <td>
                    <span className={getCategoryBadge(lead.category)}>
                      {lead.category}
                    </span>
                  </td>
                  <td>
                    {lead.createdAt
                      ? new Date(lead.createdAt).toLocaleDateString()
                      : "N/A"}
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