import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import socket, { connectSocket } from "../services/socket";

type Props = { title: string; subtitle?: string };
type Notice = { _id: string; status: "Unread" | "Read" };

export default function Topbar({ title, subtitle }: Props) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  let user: { name?: string; role?: string } = {};

  try {
    user = JSON.parse(localStorage.getItem("insuranceUser") || "{}");
  } catch {
    localStorage.removeItem("insuranceUser");
  }

  const showNotifications = user.role === "customer";

  useEffect(() => {
    if (!showNotifications) {
      setUnread(0);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const res = await api.get<Notice[]>("/notifications");
        if (active) {
          setUnread(res.data.filter((item) => item.status === "Unread").length);
        }
      } catch (error) {
        console.error("Notification badge load error:", error);
      }
    };

    void load();
    connectSocket();

    const onNew = (item: Notice) => {
      if (item.status === "Unread") setUnread((count) => count + 1);
    };
    const onUpdated = () => void load();
    const onDeleted = () => void load();

    socket.on("newNotification", onNew);
    socket.on("notificationUpdated", onUpdated);
    socket.on("notificationDeleted", onDeleted);

    return () => {
      active = false;
      socket.off("newNotification", onNew);
      socket.off("notificationUpdated", onUpdated);
      socket.off("notificationDeleted", onDeleted);
    };
  }, [showNotifications]);

  return (
    <div className="topbar">
      {showNotifications ? (
        <>
          <div className="customer-desktop-brand">
            <img src="/securelife-logo.jpg" alt="SecureLife" />
            <div>
              <strong>SecureLife</strong>
              <small>INSURANCE</small>
            </div>
          </div>

          <nav className="customer-topnav" aria-label="Customer navigation">
            <Link to="/customer-dashboard">Home</Link>
            <Link to="/insurance-plans">Insurance Plans</Link>
            <Link to="/policies">My Policies</Link>
            <Link to="/claims">Claims</Link>
            <Link to="/premiums">Payments</Link>
            <Link to="/policy-services">Services</Link>
          </nav>
        </>
      ) : (
        <div className="topbar-title">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      )}

      <div className="topbar-actions">
        {showNotifications && (
          <button
            type="button"
            className="notification-bell"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            onClick={() => navigate("/notifications")}
          >
            <span aria-hidden="true">🔔</span>
            {unread > 0 && (
              <span className="notification-count">{unread > 99 ? "99+" : unread}</span>
            )}
          </button>
        )}

        <div className="user-box">
          <strong>{user.name}</strong>
          <br />
          <small>{user.role === "customer" || !user.role ? "Policyholder" : user.role}</small>
        </div>
      </div>
    </div>
  );
}
