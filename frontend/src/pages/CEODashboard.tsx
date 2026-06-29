import { useCallback, useEffect, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Overview = {
  totalRevenue: number;
  totalLeads: number;
  totalCustomers: number;
  totalPolicies: number;
  activePolicies: number;
  totalClaims: number;
  pendingClaims: number;
  totalUsers: number;
  pendingFollowups: number;
  conversionRate: number;
};

type ChartItem = {
  month?: string;
  total?: number;
  status?: string;
  role?: string;
  count?: number;
};

type Charts = {
  revenueByMonth: ChartItem[];
  policiesByStatus: ChartItem[];
  claimsByStatus: ChartItem[];
  usersByRole: ChartItem[];
};

type LeaderboardItem = {
  userId: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  leads: number;
  policies: number;
  revenue: number;
  score: number;
};

const initialOverview: Overview = {
  totalRevenue: 0,
  totalLeads: 0,
  totalCustomers: 0,
  totalPolicies: 0,
  activePolicies: 0,
  totalClaims: 0,
  pendingClaims: 0,
  totalUsers: 0,
  pendingFollowups: 0,
  conversionRate: 0,
};

const initialCharts: Charts = {
  revenueByMonth: [],
  policiesByStatus: [],
  claimsByStatus: [],
  usersByRole: [],
};

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN")}`;

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

export default function CEODashboard() {
  const [overview, setOverview] = useState<Overview>(initialOverview);
  const [charts, setCharts] = useState<Charts>(initialCharts);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [overviewRes, chartsRes, leaderboardRes] = await Promise.all([
        api.get<Overview>("/ceo-dashboard/overview"),
        api.get<Charts>("/ceo-dashboard/charts"),
        api.get<LeaderboardItem[]>("/ceo-dashboard/leaderboard"),
      ]);

      setOverview(overviewRes.data || initialOverview);
      setCharts(chartsRes.data || initialCharts);
      setLeaderboard(
        Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []
      );
    } catch (error) {
      console.error("CEO dashboard error:", error);
      alert("CEO Dashboard load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const revenueChartData = {
    labels: charts.revenueByMonth.map((item) => item.month || "N/A"),
    datasets: [
      {
        label: "Revenue",
        data: charts.revenueByMonth.map((item) => item.total || 0),
      },
    ],
  };

  const policyChartData = {
    labels: charts.policiesByStatus.map((item) => item.status || "Unknown"),
    datasets: [
      {
        label: "Policies",
        data: charts.policiesByStatus.map((item) => item.count || 0),
      },
    ],
  };

  const claimsChartData = {
    labels: charts.claimsByStatus.map((item) => item.status || "Unknown"),
    datasets: [
      {
        label: "Claims",
        data: charts.claimsByStatus.map((item) => item.count || 0),
      },
    ],
  };

  const usersChartData = {
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
      title="CEO Analytics Dashboard"
      subtitle="Executive view of revenue, policies, claims, employees and AI KPIs"
    >
      {loading && <p>Loading CEO analytics...</p>}

      <div className="cards">
        <div className="card">
          <h3>Total Revenue</h3>
          <h1>{formatCurrency(overview.totalRevenue)}</h1>
        </div>

        <div className="card">
          <h3>Total Customers</h3>
          <h1>{overview.totalCustomers}</h1>
        </div>

        <div className="card">
          <h3>Total Policies</h3>
          <h1>{overview.totalPolicies}</h1>
        </div>

        <div className="card">
          <h3>Active Policies</h3>
          <h1>{overview.activePolicies}</h1>
        </div>

        <div className="card">
          <h3>Total Leads</h3>
          <h1>{overview.totalLeads}</h1>
        </div>

        <div className="card">
          <h3>Conversion Rate</h3>
          <h1>{overview.conversionRate}%</h1>
        </div>

        <div className="card">
          <h3>Pending Claims</h3>
          <h1>{overview.pendingClaims}</h1>
        </div>

        <div className="card">
          <h3>AI Followups</h3>
          <h1>{overview.pendingFollowups}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Executive Charts</h2>

        <div className="chart-grid">
          <div className="chart-card">
            <h3>Revenue Trend</h3>
            <div className="chart-box">
              {charts.revenueByMonth.length === 0 ? (
                <p>No revenue data.</p>
              ) : (
                <Line data={revenueChartData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>Policy Status</h3>
            <div className="chart-box">
              {charts.policiesByStatus.length === 0 ? (
                <p>No policy data.</p>
              ) : (
                <Doughnut data={policyChartData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>Claims Status</h3>
            <div className="chart-box">
              {charts.claimsByStatus.length === 0 ? (
                <p>No claim data.</p>
              ) : (
                <Bar data={claimsChartData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>User Roles</h3>
            <div className="chart-box">
              {charts.usersByRole.length === 0 ? (
                <p>No user data.</p>
              ) : (
                <Doughnut data={usersChartData} options={chartOptions} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>🏆 Employee Leaderboard</h2>

        {leaderboard.length === 0 ? (
          <p>No leaderboard data.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Role</th>
                <th>Leads</th>
                <th>Policies</th>
                <th>Revenue</th>
                <th>Score</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((item, index) => (
                <tr key={item.userId}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small>{item.email}</small>
                  </td>
                  <td>{item.role}</td>
                  <td>{item.leads}</td>
                  <td>{item.policies}</td>
                  <td>{formatCurrency(item.revenue)}</td>
                  <td>
                    <span className="badge success-badge">{item.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          className="btn small-btn"
          onClick={() => void loadDashboard()}
          disabled={loading}
          style={{ marginTop: 15 }}
        >
          Refresh CEO Dashboard
        </button>
      </div>
    </MainLayout>
  );
}