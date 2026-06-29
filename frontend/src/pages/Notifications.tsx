import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import MainLayout from "../layouts/MainLayout";

type NotificationType =
  | "Premium Due"
  | "Follow-up"
  | "Policy Expiry"
  | "Claim Update"
  | "KYC Pending"
  | "Target Alert";

type NotificationStatus = "Unread" | "Read";

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  date: string;
  status: NotificationStatus;
};

type NotificationForm = {
  title: string;
  message: string;
  type: NotificationType;
  date: string;
};

const initialForm: NotificationForm = {
  title: "",
  message: "",
  type: "Premium Due",
  date: "",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [form, setForm] = useState<NotificationForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | NotificationType>("All");

  const loadNotifications = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<NotificationItem[]>("/notifications");

      setTimeout(() => {
        setNotifications(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Notifications load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Notifications load failed");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });
    };

    const handleNotificationUpdated = (notification: NotificationItem) => {
      setNotifications((prev) =>
        prev.map((item) => (item._id === notification._id ? notification : item))
      );
    };

    const handleNotificationDeleted = (id: string) => {
      setNotifications((prev) => prev.filter((item) => item._id !== id));
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("notificationUpdated", handleNotificationUpdated);
    socket.on("notificationDeleted", handleNotificationDeleted);

    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("notificationUpdated", handleNotificationUpdated);
      socket.off("notificationDeleted", handleNotificationDeleted);
    };
  }, []);

  const addNotification = async () => {
    if (!form.title || !form.message) {
      alert("Title and Message required");
      return;
    }

    try {
      await api.post<NotificationItem>("/notifications", {
        title: form.title,
        message: form.message,
        type: form.type,
        date: form.date || new Date().toISOString().split("T")[0],
        status: "Unread",
      });

      setForm(initialForm);
    } catch (error) {
      console.error("Notification add error:", error);
      alert("Notification add failed");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put<NotificationItem>(`/notifications/${id}`, {
        status: "Read",
      });
    } catch (error) {
      console.error("Notification update error:", error);
      alert("Mark read failed");
    }
  };

  const deleteNotification = async (id: string) => {
    const ok = window.confirm("Delete this notification?");
    if (!ok) return;

    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Notification delete error:", error);
      alert("Notification delete failed");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const text = `${item.title} ${item.message}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesType = typeFilter === "All" || item.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [notifications, search, typeFilter]);

  return (
    <MainLayout
      title="Notification Center"
      subtitle="Live premium due, follow-up, claim, KYC and target alerts"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Alerts</h3>
          <h1>{notifications.length}</h1>
        </div>

        <div className="card">
          <h3>Unread</h3>
          <h1>
            {notifications.filter((item) => item.status === "Unread").length}
          </h1>
        </div>

        <div className="card">
          <h3>Premium Due</h3>
          <h1>
            {notifications.filter((item) => item.type === "Premium Due").length}
          </h1>
        </div>

        <div className="card">
          <h3>KYC Pending</h3>
          <h1>
            {notifications.filter((item) => item.type === "KYC Pending").length}
          </h1>
        </div>
      </div>

      <div className="section">
        <h2>Create Notification</h2>

        <div className="form-grid">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />

          <select
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                type: e.target.value as NotificationType,
              }))
            }
          >
            <option value="Premium Due">Premium Due</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Policy Expiry">Policy Expiry</option>
            <option value="Claim Update">Claim Update</option>
            <option value="KYC Pending">KYC Pending</option>
            <option value="Target Alert">Target Alert</option>
          </select>

          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, date: e.target.value }))
            }
          />
        </div>

        <textarea
          className="text-area"
          placeholder="Message"
          value={form.message}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, message: e.target.value }))
          }
        />

        <button className="btn small-btn" onClick={addNotification}>
          Add Notification
        </button>
      </div>

      <div className="section">
        <h2>Search & Filter</h2>

        <div className="form-grid">
          <input
            placeholder="Search notification"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "All" | NotificationType)
            }
          >
            <option value="All">All Types</option>
            <option value="Premium Due">Premium Due</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Policy Expiry">Policy Expiry</option>
            <option value="Claim Update">Claim Update</option>
            <option value="KYC Pending">KYC Pending</option>
            <option value="Target Alert">Target Alert</option>
          </select>

          <button className="mini-btn" onClick={loadNotifications}>
            Refresh
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Notifications</h2>

        {loading ? (
          <p>Loading...</p>
        ) : filteredNotifications.length === 0 ? (
          <p>No notifications found.</p>
        ) : (
          <div className="lead-grid">
            {filteredNotifications.map((item) => (
              <div className="lead-card" key={item._id}>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <p>📅 {item.date}</p>
                <p>🏷️ {item.type}</p>

                <span className="badge">{item.status}</span>

                <div style={{ marginTop: 12 }}>
                  {item.status === "Unread" && (
                    <button
                      className="mini-btn"
                      onClick={() => markAsRead(item._id)}
                    >
                      Mark Read
                    </button>
                  )}

                  <button
                    className="mini-btn danger-btn"
                    onClick={() => deleteNotification(item._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}