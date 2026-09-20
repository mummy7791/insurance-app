import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import socket, { connectSocket } from "../services/socket";
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
  recipientId?: string;
};

type Recipient = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
};

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type NotificationForm = {
  title: string;
  message: string;
  type: NotificationType;
  date: string;
  recipientId: string;
};

const STAFF_ROLES = [
  "admin",
  "bm",
  "unit_manager",
  "agency_manager",
  "advisor",
  "agent",
];

const initialForm: NotificationForm = {
  title: "",
  message: "",
  type: "Premium Due",
  date: "",
  recipientId: "",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [form, setForm] = useState<NotificationForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | NotificationType>("All");

  const user = useMemo<StoredUser>(() => {
    try {
      return JSON.parse(localStorage.getItem("insuranceUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const isStaff = Boolean(user.role && STAFF_ROLES.includes(user.role));

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<NotificationItem[]>("/notifications");
      setNotifications(res.data);
    } catch (error) {
      console.error("Notifications load error:", error);
      alert("Notifications load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecipients = useCallback(async () => {
    try {
      const res = await api.get<Recipient[]>("/notifications/recipients");
      setRecipients(res.data);
    } catch (error) {
      console.error("Notification recipients load error:", error);
      alert("Customer recipients load failed");
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    if (isStaff) {
      void loadRecipients();
    }
  }, [isStaff, loadNotifications, loadRecipients]);

  useEffect(() => {
    connectSocket();

    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });
    };

    const handleNotificationUpdated = (notification: NotificationItem) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? notification : item
        )
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
    if (!isStaff) return;

    if (!form.recipientId) {
      alert("Please select a customer");
      return;
    }

    if (!form.title.trim() || !form.message.trim()) {
      alert("Title and Message required");
      return;
    }

    try {
      const res = await api.post<NotificationItem>("/notifications", {
        recipientId: form.recipientId,
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        date: form.date || new Date().toISOString().split("T")[0],
        status: "Unread",
      });

      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === res.data._id);
        return exists ? prev : [res.data, ...prev];
      });

      setForm(initialForm);
    } catch (error) {
      console.error("Notification add error:", error);
      alert("Notification add failed");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await api.put<NotificationItem>(`/notifications/${id}`, {
        status: "Read",
      });

      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? res.data : item))
      );
    } catch (error) {
      console.error("Notification update error:", error);
      alert("Mark read failed");
    }
  };

  const deleteNotification = async (id: string) => {
    if (!isStaff) return;

    const ok = window.confirm("Delete this notification?");
    if (!ok) return;

    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
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
      subtitle={isStaff ? "Manage customer alerts and service updates" : "Important updates about your policy, premium, claim and KYC"}
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

      {isStaff && (
        <div className="section">
          <h2>Create Notification</h2>

          <div className="form-grid">
            <select
              value={form.recipientId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  recipientId: e.target.value,
                }))
              }
            >
              <option value="">Select Customer</option>
              {recipients.map((recipient) => (
                <option key={recipient._id} value={recipient._id}>
                  {recipient.name} — {recipient.email}
                </option>
              ))}
            </select>

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

          <button className="btn small-btn" onClick={() => void addNotification()}>
            Add Notification
          </button>
        </div>
      )}

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

          <button className="mini-btn" onClick={() => void loadNotifications()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">INBOX</span><h2>${isStaff ? "Notifications" : "My Updates"}</h2></div><span className="secure-chip">${notifications.filter((item) => item.status === "Unread").length} unread</span></div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredNotifications.length === 0 ? (
          <p>No notifications found.</p>
        ) : (
          <div className="lead-grid">
            {filteredNotifications.map((item) => (
              <div className={`lead-card notification-card ${item.status === "Unread" ? "notification-unread" : ""}`} key={item._id}>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <p>📅 {item.date}</p>
                <p>🏷️ {item.type}</p>

                <span className="badge">{item.status}</span>

                <div style={{ marginTop: 12 }}>
                  {item.status === "Unread" && (
                    <button
                      className="mini-btn"
                      onClick={() => void markAsRead(item._id)}
                    >
                      Mark Read
                    </button>
                  )}

                  {isStaff && (
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => void deleteNotification(item._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
