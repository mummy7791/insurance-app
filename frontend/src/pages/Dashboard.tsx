import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

type User = {
  name?: string;
  role?: string;
  email?: string;
};

type DashboardStats = {
  totalLeads: number;
  totalCustomers: number;
  totalPolicies: number;
  activePolicies: number;
  totalPremiums: number;
  premiumCollected: number;
  pendingPremium: number;
  totalClaims: number;
  pendingClaims: number;
  totalCommission: number;
};

type AuditLog = {
  _id: string;
  userName?: string;
  userEmail?: string;
  action?: string;
  module?: string;
  description?: string;
  createdAt?: string;
};

type ChartItem = {
  month?: string;
  total?: number;
  count?: number;
  status?: string;
  role?: string;
};

type DashboardCharts = {
  premiumByMonth: ChartItem[];
  policyByStatus: ChartItem[];
  claimsByStatus: ChartItem[];
  usersByRole: ChartItem[];
};

const initialStats: DashboardStats = {
  totalLeads: 0,
  totalCustomers: 0,
  totalPolicies: 0,
  activePolicies: 0,
  totalPremiums: 0,
  premiumCollected: 0,
  pendingPremium: 0,
  totalClaims: 0,
  pendingClaims: 0,
  totalCommission: 0,
};

const initialCharts: DashboardCharts = {
  premiumByMonth: [],
  policyByStatus: [],
  claimsByStatus: [],
  usersByRole: [],
};

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
    },
  },
};

export default function Dashboard() {
  const user: User = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("insuranceUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [charts, setCharts] = useState<DashboardCharts>(initialCharts);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [statsRes, chartsRes, auditRes] = await Promise.allSettled([
        api.get<DashboardStats>("/dashboard/stats"),
        api.get<DashboardCharts>("/dashboard/charts"),
        api.get<AuditLog[]>("/audit-logs"),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data || initialStats);
      }
      if (chartsRes.status === "fulfilled") {
        setCharts(chartsRes.value.data || initialCharts);
      }
      if (auditRes.status === "fulfilled") {
        setAuditLogs(
          Array.isArray(auditRes.value.data) ? auditRes.value.data : []
        );
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);

      void loadDashboard().finally(() => {
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const todayLogs = auditLogs.filter(
    (log) =>
      log.createdAt &&
      new Date(log.createdAt).toDateString() === new Date().toDateString()
  );

  const loginCount = todayLogs.filter((log) => log.action === "LOGIN").length;

  const userChangeCount = todayLogs.filter(
    (log) => log.module === "USER_MANAGEMENT"
  ).length;

  const premiumChartData = {
    labels: charts.premiumByMonth.map((item) => item.month || "N/A"),
    datasets: [
      {
        label: "Premium Amount",
        data: charts.premiumByMonth.map((item) => item.total || 0),
      },
    ],
  };

  const policyStatusData = {
    labels: charts.policyByStatus.map((item) => item.status || "Unknown"),
    datasets: [
      {
        label: "Policies",
        data: charts.policyByStatus.map((item) => item.count || 0),
      },
    ],
  };

  const claimsStatusData = {
    labels: charts.claimsByStatus.map((item) => item.status || "Unknown"),
    datasets: [
      {
        label: "Claims",
        data: charts.claimsByStatus.map((item) => item.count || 0),
      },
    ],
  };

  const usersRoleData = {
    labels: charts.usersByRole.map((item) => item.role || "Unknown"),
    datasets: [
      {
        label: "Users",
        data: charts.usersByRole.map((item) => item.count || 0),
      },
    ],
  };

  return (
    <MainLayout
      title={`Welcome, ${user.name || user.email || "User"}`}
      subtitle={`Role: ${user.role || "agent"}`}
    >
      <div className="admin-command-hero"><div><span className="eyebrow">SECURELIFE OPERATIONS</span><h2>Business control center</h2><p>Monitor protection business, collections, claims and team activity from one workspace.</p></div><div className="admin-command-actions">{user.role === "admin" && <Link className="btn small-btn" to="/admin-insurance-plans">Manage plans</Link>}<Link className="mini-btn" to="/policy-purchases">Policy purchases</Link>{user.role === "admin" && <Link className="mini-btn" to="/user-management">Team access</Link>}</div></div>

      {loading && <div className="dashboard-loading"><span className="checkout-spinner" />Refreshing live operations...</div>}

      <div className="admin-kpi-grid">
        <div className="card">
          <h3>Total Leads</h3>
          <h1>{stats.totalLeads}</h1>
        </div>

        <div className="card">
          <h3>Total Customers</h3>
          <h1>{stats.totalCustomers}</h1>
        </div>

        <div className="card">
          <h3>Total Policies</h3>
          <h1>{stats.totalPolicies}</h1>
        </div>

        <div className="card">
          <h3>Active Policies</h3>
          <h1>{stats.activePolicies}</h1>
        </div>

        <div className="card">
          <h3>Total Premiums</h3>
          <h1>{stats.totalPremiums}</h1>
        </div>

        <div className="card">
          <h3>Premium Collected</h3>
          <h1>{formatCurrency(stats.premiumCollected)}</h1>
        </div>

        <div className="card">
          <h3>Pending Premium</h3>
          <h1>{formatCurrency(stats.pendingPremium)}</h1>
        </div>

        <div className="card">
          <h3>Total Commission</h3>
          <h1>{formatCurrency(stats.totalCommission)}</h1>
        </div>

        <div className="card">
          <h3>Claims Pending</h3>
          <h1>{stats.pendingClaims}</h1>
        </div>

        <div className="card">
          <h3>Today Logins</h3>
          <h1>{loginCount}</h1>
        </div>

        <div className="card">
          <h3>User Changes</h3>
          <h1>{userChangeCount}</h1>
        </div>
      </div>

      <div className="section admin-insight-section">
        <div className="section-heading-row"><div><span className="eyebrow">BUSINESS INSIGHTS</span><h2>Performance overview</h2></div><span className="secure-chip">Live workspace</span></div>

        <div className="chart-grid">
          <div className="chart-card">
            <h3>Monthly Premium Collection</h3>
            <div className="chart-box">
              {charts.premiumByMonth.length === 0 ? (
                <p>No premium chart data.</p>
              ) : (
                <Line data={premiumChartData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>Policy Status</h3>
            <div className="chart-box">
              {charts.policyByStatus.length === 0 ? (
                <p>No policy chart data.</p>
              ) : (
                <Doughnut data={policyStatusData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>Claims Status</h3>
            <div className="chart-box">
              {charts.claimsByStatus.length === 0 ? (
                <p>No claims chart data.</p>
              ) : (
                <Bar data={claimsStatusData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>User Roles</h3>
            <div className="chart-box">
              {charts.usersByRole.length === 0 ? (
                <p>No user role chart data.</p>
              ) : (
                <Doughnut data={usersRoleData} options={chartOptions} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="section admin-audit-section">
        <div className="section-heading-row"><div><span className="eyebrow">SECURITY & ACTIVITY</span><h2>Recent audit activity</h2></div><span className="secure-chip">Latest 5 events</span></div>

        {auditLogs.length === 0 ? (
          <p>No recent activity found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>

            <tbody>
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log._id}>
                  <td>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "N/A"}
                  </td>
                  <td>{log.userName || log.userEmail || "Unknown"}</td>
                  <td>{log.module || "N/A"}</td>
                  <td>
                    <span className="badge">{log.action || "N/A"}</span>
                  </td>
                  <td>{log.description || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}