import { useCallback, useEffect, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

type ReportCardData = {
  totalCustomers: number;
  totalPolicies: number;
  totalPremiums: number;
  totalClaims: number;
  totalEmployees: number;
  totalCommissions: number;
  paidPremiumAmount: number;
  duePremiumAmount: number;
  activePolicies: number;
  pendingClaims: number;
  paidCommissionAmount: number;
  pendingCommissionAmount: number;
};

type StatusReport = {
  _id: string;
  count: number;
  total?: number;
};

type RoleReport = {
  _id: string;
  count: number;
  total: number;
};

type MonthReport = {
  _id: string;
  count: number;
  total: number;
};

type ReportsResponse = {
  cards: ReportCardData;
  premiumByStatus: StatusReport[];
  claimsByStatus: StatusReport[];
  policiesByStatus: StatusReport[];
  commissionByRole: RoleReport[];
  premiumByMonth: MonthReport[];
};

const emptyReports: ReportsResponse = {
  cards: {
    totalCustomers: 0,
    totalPolicies: 0,
    totalPremiums: 0,
    totalClaims: 0,
    totalEmployees: 0,
    totalCommissions: 0,
    paidPremiumAmount: 0,
    duePremiumAmount: 0,
    activePolicies: 0,
    pendingClaims: 0,
    paidCommissionAmount: 0,
    pendingCommissionAmount: 0,
  },
  premiumByStatus: [],
  claimsByStatus: [],
  policiesByStatus: [],
  commissionByRole: [],
  premiumByMonth: [],
};

export default function Analytics() {
  const [reports, setReports] = useState<ReportsResponse>(emptyReports);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<ReportsResponse>("/reports");

      setTimeout(() => {
        setReports(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Analytics load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Analytics load failed");
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const premiumByMonthData = {
    labels: reports.premiumByMonth.map((item) => item._id),
    datasets: [
      {
        label: "Premium Amount",
        data: reports.premiumByMonth.map((item) => item.total),
      },
    ],
  };

  const claimsStatusData = {
    labels: reports.claimsByStatus.map((item) => item._id),
    datasets: [
      {
        label: "Claims",
        data: reports.claimsByStatus.map((item) => item.count),
      },
    ],
  };

  const policyStatusData = {
    labels: reports.policiesByStatus.map((item) => item._id),
    datasets: [
      {
        label: "Policies",
        data: reports.policiesByStatus.map((item) => item.count),
      },
    ],
  };

  const commissionRoleData = {
    labels: reports.commissionByRole.map((item) => item._id),
    datasets: [
      {
        label: "Commission",
        data: reports.commissionByRole.map((item) => item.total),
      },
    ],
  };

  return (
    <MainLayout
      title="Analytics Dashboard"
      subtitle="Live charts from MongoDB reports"
    >
      <button className="mini-btn" onClick={loadAnalytics}>
        Refresh Analytics
      </button>

      {loading && <p>Loading analytics...</p>}

      <div className="cards">
        <div className="card">
          <h3>Paid Premium</h3>
          <h1>₹{reports.cards.paidPremiumAmount}</h1>
        </div>

        <div className="card">
          <h3>Due Premium</h3>
          <h1>₹{reports.cards.duePremiumAmount}</h1>
        </div>

        <div className="card">
          <h3>Paid Commission</h3>
          <h1>₹{reports.cards.paidCommissionAmount}</h1>
        </div>

        <div className="card">
          <h3>Pending Claims</h3>
          <h1>{reports.cards.pendingClaims}</h1>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h2>Monthly Premium Collection</h2>
          {reports.premiumByMonth.length === 0 ? (
            <p>No premium monthly data.</p>
          ) : (
            <Line data={premiumByMonthData} />
          )}
        </div>

        <div className="chart-card">
          <h2>Claims By Status</h2>
          {reports.claimsByStatus.length === 0 ? (
            <p>No claim status data.</p>
          ) : (
            <Doughnut data={claimsStatusData} />
          )}
        </div>

        <div className="chart-card">
          <h2>Policies By Status</h2>
          {reports.policiesByStatus.length === 0 ? (
            <p>No policy status data.</p>
          ) : (
            <Bar data={policyStatusData} />
          )}
        </div>

        <div className="chart-card">
          <h2>Commission By Role</h2>
          {reports.commissionByRole.length === 0 ? (
            <p>No commission role data.</p>
          ) : (
            <Bar data={commissionRoleData} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}