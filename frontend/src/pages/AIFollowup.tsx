import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Followup = {
  _id: string;
  title: string;
  description: string;
  type: string;
  priority: "High" | "Medium" | "Low";
  followupDate: string;
  status: "Pending" | "Completed";
};

export default function AIFollowup() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowups = useCallback(async () => {
    const res = await api.get<Followup[]>("/ai-followups");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const loadFollowups = useCallback(async () => {
    try {
      const data = await fetchFollowups();
      setFollowups(data);
    } catch (error) {
      console.error("AI followups load error:", error);
      alert("Failed to load followups");
    }
  }, [fetchFollowups]);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);

      void fetchFollowups()
        .then((data) => {
          if (active) {
            setFollowups(data);
          }
        })
        .catch((error) => {
          console.error("AI followups load error:", error);
          alert("Failed to load followups");
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
  }, [fetchFollowups]);

  const generateAI = async () => {
    try {
      setLoading(true);

      await api.post("/ai-followups/generate");

      alert("AI Followups Generated");

      const data = await fetchFollowups();
      setFollowups(data);
    } catch (error) {
      console.error("AI generate error:", error);
      alert("Generate failed");
    } finally {
      setLoading(false);
    }
  };

  const completeFollowup = async (id: string) => {
    try {
      const res = await api.put<Followup>(`/ai-followups/${id}/complete`);

      setFollowups((prev) =>
        prev.map((item) => (item._id === id ? res.data : item))
      );
    } catch (error) {
      console.error("Complete followup error:", error);
      alert("Complete failed");
    }
  };

  const deleteFollowup = async (id: string) => {
    if (!window.confirm("Delete followup?")) return;

    try {
      await api.delete(`/ai-followups/${id}`);

      setFollowups((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Delete followup error:", error);
      alert("Delete failed");
    }
  };

  const today = useMemo(() => {
    const now = new Date();

    return followups.filter(
      (item) =>
        item.status === "Pending" &&
        new Date(item.followupDate).toDateString() === now.toDateString()
    );
  }, [followups]);

  const overdue = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    return followups.filter(
      (item) =>
        item.status === "Pending" &&
        new Date(item.followupDate) < startToday
    );
  }, [followups]);

  const upcoming = useMemo(() => {
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    sevenDays.setHours(23, 59, 59, 999);

    return followups.filter((item) => {
      const date = new Date(item.followupDate);

      return (
        item.status === "Pending" &&
        date > endToday &&
        date <= sevenDays
      );
    });
  }, [followups]);

  const completed = useMemo(() => {
    return followups.filter((item) => item.status === "Completed");
  }, [followups]);

  return (
    <MainLayout title="AI Auto Follow-up" subtitle="Smart Follow-up Scheduler">
      <div className="cards">
        <div className="card">
          <h3>Total</h3>
          <h1>{followups.length}</h1>
        </div>

        <div className="card">
          <h3>Today&apos;s</h3>
          <h1>{today.length}</h1>
        </div>

        <div className="card">
          <h3>Overdue</h3>
          <h1>{overdue.length}</h1>
        </div>

        <div className="card">
          <h3>Upcoming</h3>
          <h1>{upcoming.length}</h1>
        </div>

        <div className="card">
          <h3>Completed</h3>
          <h1>{completed.length}</h1>
        </div>
      </div>

      <div className="section">
        <button className="btn" onClick={generateAI} disabled={loading}>
          {loading ? "Please wait..." : "🤖 Generate AI Followups"}
        </button>

        <button
          className="btn"
          onClick={() => void loadFollowups()}
          disabled={loading}
          style={{ marginLeft: 10 }}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="section">
        <h2>AI Smart Followups</h2>

        {loading ? (
          <p>Loading...</p>
        ) : followups.length === 0 ? (
          <p>No followups found</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Status</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {followups.map((item) => (
                <tr key={item._id}>
                  <td>{item.title}</td>
                  <td>{item.type}</td>
                  <td>
                    <span
                      className={
                        item.priority === "High"
                          ? "badge danger-badge"
                          : item.priority === "Medium"
                          ? "badge warning-badge"
                          : "badge"
                      }
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td>{new Date(item.followupDate).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={
                        item.status === "Completed"
                          ? "badge success-badge"
                          : "badge"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.description}</td>
                  <td>
                    {item.status === "Pending" && (
                      <button
                        className="mini-btn"
                        onClick={() => void completeFollowup(item._id)}
                      >
                        ✅ Complete
                      </button>
                    )}

                    <button
                      className="mini-btn danger-btn"
                      onClick={() => void deleteFollowup(item._id)}
                      style={{ marginLeft: 5 }}
                    >
                      🗑 Delete
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