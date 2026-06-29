import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type ScoreData = {
  leadConversion?: number;
  premiumCollection?: number;
  followups?: number;
  claims?: number;
  attendance?: number;
  overall?: number;
};

type CountData = {
  leads?: number;
  policies?: number;
  paidPremiums?: number;
  totalPremiums?: number;
  completedFollowups?: number;
  totalFollowups?: number;
  closedClaims?: number;
  totalClaims?: number;
};

type PerformanceItem = {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  branch?: string;
  scores?: ScoreData;
  counts?: CountData;
};

const getBadgeClass = (score: number): string => {
  if (score >= 80) return "badge success-badge";
  if (score >= 50) return "badge warning-badge";
  return "badge danger-badge";
};

const safeScore = (score?: number): number => {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score;
  }

  return 0;
};

export default function AIPerformance() {
  const [items, setItems] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchPerformance = useCallback(async (): Promise<PerformanceItem[]> => {
    const res = await api.get<PerformanceItem[]>("/ai-performance");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const loadPerformance = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchPerformance();
      setItems(data);
    } catch (error) {
      console.error("AI performance load error:", error);
      alert("AI performance load failed");
    } finally {
      setLoading(false);
    }
  }, [fetchPerformance]);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);

      void fetchPerformance()
        .then((data) => {
          if (active) {
            setItems(data);
          }
        })
        .catch((error) => {
          console.error("AI performance load error:", error);
          alert("AI performance load failed");
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [fetchPerformance]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.name || ""} ${item.email || ""} ${
        item.role || ""
      } ${item.branch || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [items, search]);

  const topUser = items[0];

  const avgScore = useMemo(() => {
    if (items.length === 0) return 0;

    const total = items.reduce((sum, item) => {
      return sum + safeScore(item.scores?.overall);
    }, 0);

    return Math.round(total / items.length);
  }, [items]);

  return (
    <MainLayout
      title="AI Performance"
      subtitle="Employee AI ranking, score and leaderboard"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Employees</h3>
          <h1>{items.length}</h1>
        </div>

        <div className="card">
          <h3>Average Score</h3>
          <h1>{avgScore}</h1>
        </div>

        <div className="card">
          <h3>Top Performer</h3>
          <h1>{topUser?.name || "N/A"}</h1>
        </div>

        <div className="card">
          <h3>Top Score</h3>
          <h1>{safeScore(topUser?.scores?.overall)}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Search Employees</h2>

        <div className="form-grid">
          <input
            placeholder="Search name, email, role, branch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="mini-btn"
            onClick={() => void loadPerformance()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="section">
        <h2>🏆 AI Performance Leaderboard</h2>

        {loading ? (
          <p>Loading performance...</p>
        ) : filteredItems.length === 0 ? (
          <p>No performance data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Role</th>
                <th>Overall</th>
                <th>Lead</th>
                <th>Premium</th>
                <th>Follow-up</th>
                <th>Claims</th>
                <th>Attendance</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item, index) => {
                const overall: number = safeScore(item.scores?.overall);

                return (
                  <tr key={item.userId}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>{item.name || "Unknown"}</strong>
                      <br />
                      <small>{item.email || "N/A"}</small>
                    </td>

                    <td>{item.role || "N/A"}</td>

                    <td>
                      <span className={getBadgeClass(overall)}>
                        ⭐ {overall}
                      </span>
                    </td>

                    <td>{safeScore(item.scores?.leadConversion)}%</td>
                    <td>{safeScore(item.scores?.premiumCollection)}%</td>
                    <td>{safeScore(item.scores?.followups)}%</td>
                    <td>{safeScore(item.scores?.claims)}%</td>
                    <td>{safeScore(item.scores?.attendance)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Detailed Score Cards</h2>

        <div className="lead-grid">
          {filteredItems.map((item) => {
            const overall: number = safeScore(item.scores?.overall);

            return (
              <div className="lead-card" key={`card-${item.userId}`}>
                <h3>{item.name || "Unknown"}</h3>
                <p>{item.email || "N/A"}</p>

                <span className={getBadgeClass(overall)}>
                  AI Score: {overall}/100
                </span>

                <p>
                  🎯 Lead Conversion:{" "}
                  {safeScore(item.scores?.leadConversion)}%
                </p>

                <p>
                  💰 Premium Collection:{" "}
                  {safeScore(item.scores?.premiumCollection)}%
                </p>

                <p>📞 Follow-ups: {safeScore(item.scores?.followups)}%</p>
                <p>🧾 Claims: {safeScore(item.scores?.claims)}%</p>
                <p>📅 Attendance: {safeScore(item.scores?.attendance)}%</p>

                <hr />

                <p>Leads: {item.counts?.leads || 0}</p>
                <p>Policies: {item.counts?.policies || 0}</p>

                <p>
                  Premiums: {item.counts?.paidPremiums || 0}/
                  {item.counts?.totalPremiums || 0}
                </p>

                <p>
                  Follow-ups: {item.counts?.completedFollowups || 0}/
                  {item.counts?.totalFollowups || 0}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}