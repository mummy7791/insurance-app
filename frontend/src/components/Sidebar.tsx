import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

type UserRole =
  | "admin"
  | "bm"
  | "unit_manager"
  | "agency_manager"
  | "advisor"
  | "agent"
  | "customer";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  branch?: string;
};

const customerMenu = [
  { name: "Home", path: "/customer-dashboard", icon: "⌂" },
  { name: "Insurance Plans", path: "/insurance-plans", icon: "◇" },
  { name: "My Policies", path: "/policies", icon: "▣" },
  { name: "My Quotations", path: "/quotations", icon: "▧" },
  { name: "Policy Services", path: "/policy-services", icon: "↻" },
  { name: "Premiums", path: "/premiums", icon: "₹" },
  { name: "Claims", path: "/claims", icon: "◎" },
  { name: "KYC & Documents", path: "/documents", icon: "▤" },
  { name: "Profile", path: "/customer-profile", icon: "●" },
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
  { name: "Home", path: "/advisor-dashboard", icon: "⌂", roles: ["advisor"] },
  { name: "Plans", path: "/insurance-plans", icon: "◇", roles: ["advisor"] },
  { name: "Commission", path: "/commission", icon: "%", roles: ["advisor"] },
  { name: "My Profile", path: "/profile", icon: "◉", roles: ["advisor"] },
  { name: "Customers", path: "/customers", icon: "◉", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Policies", path: "/policies", icon: "▣", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Policy Services", path: "/policy-services", icon: "↻", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Policy Purchases", path: "/policy-purchases", icon: "◇", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Quotations", path: "/quotations", icon: "▧", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Premiums", path: "/premiums", icon: "₹", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Claims", path: "/claims", icon: "◎", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "KYC & Documents", path: "/documents", icon: "▤", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Team", path: "/employees", icon: "◌", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Commission", path: "/commission", icon: "%", roles: ["admin", "bm", "unit_manager", "agency_manager", "agent"] },
  { name: "Reports", path: "/reports", icon: "▥", roles: ["admin", "bm", "unit_manager", "agency_manager"] },
  { name: "Plan Management", path: "/admin-insurance-plans", icon: "◆", roles: ["admin"] },
  { name: "User Access", path: "/user-management", icon: "⌘", roles: ["admin"] },
  { name: "Settings", path: "/settings", icon: "⚙", roles: ["admin"] },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

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
          <img src="/securelife-logo.jpg" alt="SecureLife Insurance" className="sidebar-logo" />

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
          </Link>
        ))}

        {role === "customer" ? (
          <>
            <button className="customer-logout-link" onClick={logout}><span>↪</span> Logout</button>
            <div className="sidebar-secure-card">
              <b>🛡 Secure & Trusted</b>
              <small>Your data is protected<br/>with bank-level security.</small>
            </div>
          </>
        ) : (
          <button className="logout" onClick={logout} style={{ width: "100%" }}>Sign out</button>
        )}
      </aside>
    </>
  );
}