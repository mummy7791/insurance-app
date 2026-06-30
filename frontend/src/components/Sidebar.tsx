import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";

type UserRole =
  | "admin"
  | "bm"
  | "unit_manager"
  | "agency_manager"
  | "agent";

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

type MenuItem = {
  name: string;
  path: string;
  icon: string;
  roles: UserRole[];
};

const menuItems: MenuItem[] = [
  { name: "Role Dashboard", path: "/role-dashboard", icon: "🔐", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Dashboard", path: "/dashboard", icon: "🏠", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Profile", path: "/profile", icon: "👤", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Create Staff", path: "/admin-create-staff", icon: "👥", roles: ["admin"] },
  { name: "Admin Plans", path: "/admin-insurance-plans", icon: "🛡️", roles: ["admin"] },

  {
    name: "Policy Purchases",
    path: "/policy-purchases",
    icon: "🛒",
    roles: ["admin", "bm", "unit_manager", "agency_manager"],
  },

  { name: "Branches", path: "/branch", icon: "🏢", roles: ["admin", "bm"] },
  { name: "Employees", path: "/employees", icon: "👨‍💼", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Targets", path: "/targets", icon: "🎯", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Leads", path: "/leads", icon: "📋", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Customers", path: "/customers", icon: "👥", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Policies", path: "/policies", icon: "📑", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Premiums", path: "/premiums", icon: "💰", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Payment", path: "/payment", icon: "💳", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Commission", path: "/commission", icon: "💸", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Claims", path: "/claims", icon: "🧾", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Documents", path: "/documents", icon: "📂", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Calendar", path: "/calendar", icon: "📅", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "GPS Tracking", path: "/gps-tracking", icon: "📍", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Notifications", path: "/notifications", icon: "🔔", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Communication", path: "/communication", icon: "📧", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Analytics", path: "/analytics", icon: "📈", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "PDF Reports", path: "/pdf-reports", icon: "📄", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Excel Reports", path: "/excel-reports", icon: "📊", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Reports", path: "/reports", icon: "📊", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "User Management", path: "/user-management", icon: "👥", roles: ["admin"] },
  { name: "Audit Logs", path: "/audit-logs", icon: "📝", roles: ["admin", "bm"] },
  { name: "AI Assistant", path: "/ai-assistant", icon: "🤖", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "AI Follow-ups", path: "/ai-followups", icon: "🤖", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "AI Performance", path: "/ai-performance", icon: "🏆", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "AI Lead Scoring", path: "/ai-lead-scoring", icon: "🔥", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "AI Sales Prediction", path: "/ai-sales-prediction", icon: "📈", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Customer Portal", path: "/customer-portal", icon: "👤", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Email Marketing", path: "/email-marketing", icon: "📧", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Policy AI", path: "/policy-recommendation-ai", icon: "🧠", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "CEO Dashboard", path: "/ceo-dashboard", icon: "📊", roles: ["admin", "bm"] },
  { name: "OCR Verification", path: "/ocr-verification", icon: "📄", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Enterprise Tools", path: "/enterprise-tools", icon: "🚀", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "File Manager", path: "/file-manager", icon: "📂", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Customer Dashboard", path: "/customer-dashboard", icon: "👤", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Customer Profile", path: "/customer-profile", icon: "👤", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Buy Policy", path: "/online-policy-purchase", icon: "🛒", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Insurance Plans", path: "/insurance-plans", icon: "🛡️", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "AI Policy", path: "/ai-policy-recommendation", icon: "🤖", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Settings", path: "/settings", icon: "⚙️", roles: ["admin"] },
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

  const role: UserRole = user.role || "agent";

  const filteredMenu = useMemo(() => {
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

      navigate("/email-otp-login", { replace: true });
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
          <img src="ic_launcher.png" alt="ICICI Life" className="sidebar-logo" />

          <div className="sidebar-title">
            <h2>ICICI</h2>
            <small>ICICI LIFE</small>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <strong>{user.name || user.email || "User"}</strong>
          <br />
          <small>{role}</small>

          {user.branch && (
            <>
              <br />
              <small>Branch: {user.branch}</small>
            </>
          )}
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
          🚪 Logout
        </button>
      </aside>
    </>
  );
}