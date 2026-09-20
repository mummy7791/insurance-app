import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";

type UserRole =
  | "admin"
  | "bm"
  | "unit_manager"
  | "agency_manager"
  | "agent"
  | "customer";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  branch?: string;
};

type NotificationItem = {
  _id: string;
  status: "Unread" | "Read";
};

const customerMenu = [
  { name: "Overview", path: "/customer-dashboard", icon: "⌂" },
  { name: "Explore Plans", path: "/insurance-plans", icon: "◇" },
  { name: "My Policies", path: "/policies", icon: "▣" },
  { name: "Premiums", path: "/premiums", icon: "₹" },
  { name: "Claims", path: "/claims", icon: "◎" },
  { name: "KYC & Documents", path: "/documents", icon: "▤" },
  { name: "Notifications", path: "/notifications", icon: "○" },
  { name: "My Profile", path: "/customer-profile", icon: "◉" },
  { name: "Policy Assistant", path: "/ai-policy-recommendation", icon: "✦" },
  { name: "Help & Support", path: "/help", icon: "?" },
];

type MenuItem = {
  name: string;
  path: string;
  icon: string;
  roles: UserRole[];
};

const menuItems: MenuItem[] = [
  { name: "Dashboard", path: "/dashboard", icon: "⌂", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Customers", path: "/customers", icon: "◉", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Policies", path: "/policies", icon: "▣", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Policy Purchases", path: "/policy-purchases", icon: "◇", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Premiums", path: "/premiums", icon: "₹", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Claims", path: "/claims", icon: "◎", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "KYC & Documents", path: "/documents", icon: "▤", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Team", path: "/employees", icon: "◌", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Commission", path: "/commission", icon: "%", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Reports", path: "/reports", icon: "▥", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Notifications", path: "/notifications", icon: "○", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Plan Management", path: "/admin-insurance-plans", icon: "◆", roles: ["admin"] },
  { name: "User Access", path: "/user-management", icon: "⌘", roles: ["admin"] },
  { name: "Settings", path: "/settings", icon: "⚙", roles: ["admin"] },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user: User = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("insuranceUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const role: UserRole = user.role || "customer";

  const filteredMenu = useMemo(() => {
    if (role === "customer") return customerMenu;
    return menuItems.filter((item) => item.roles.includes(role));
  }, [role]);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      try {
        const res = await api.get<NotificationItem[]>("/notifications");
        if (!mounted) return;

        const count = res.data.filter((item) => item.status === "Unread").length;
        setUnreadCount(count);
      } catch (error) {
        console.error("Unread notification count error:", error);
      }
    };

    void loadUnreadCount();

    const handleNewNotification = (notification: NotificationItem) => {
      if (notification.status === "Unread") {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleNotificationUpdated = (notification: NotificationItem) => {
      if (notification.status === "Read") {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
    };

    const handleNotificationDeleted = () => {
      void loadUnreadCount();
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("notificationUpdated", handleNotificationUpdated);
    socket.on("notificationDeleted", handleNotificationDeleted);

    return () => {
      mounted = false;
      socket.off("newNotification", handleNewNotification);
      socket.off("notificationUpdated", handleNotificationUpdated);
      socket.off("notificationDeleted", handleNotificationDeleted);
    };
  }, []);

  const logout = async () => {
    try {
      await api.post("/audit-logs", {
        action: "LOGOUT",
        module: "AUTH",
        description: `${user.name || user.email || "User"} logged out`,
      });
    } catch (error) {
      console.error("Logout audit log error:", error);
    } finally {
      localStorage.removeItem("insuranceToken");
      localStorage.removeItem("insuranceUser");
      localStorage.removeItem("firebaseToken");
      localStorage.removeItem("firebaseUser");

      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      <div
        className={sidebarOpen ? "sidebar-overlay show" : "sidebar-overlay"}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">
          <img src="/ic_launcher.png" alt="SecureLife Insurance" className="sidebar-logo" />

          <div className="sidebar-title">
            <h2>SecureLife</h2>
            <small>INSURANCE</small>
          </div>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-avatar">{(user.name || user.email || "U").charAt(0).toUpperCase()}</div>
          <div><strong>{user.name || user.email || "User"}</strong>
          <br />
          <small>{role === "customer" ? "Policyholder" : role}</small></div>

          {user.branch && <small className="sidebar-branch">Branch: {user.branch}</small>}
        </div>

        {filteredMenu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={location.pathname === item.path ? "active-link" : ""}
          >
            <span>
              {item.icon} {item.name}
            </span>

            {item.path === "/notifications" && unreadCount > 0 && (
              <span className="notify-badge">{unreadCount}</span>
            )}
          </Link>
        ))}

        <hr
          style={{
            margin: "20px 0",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        />

        <button className="logout" onClick={logout} style={{ width: "100%" }}>
          Sign out
        </button>
      </aside>
    </>
  );
}