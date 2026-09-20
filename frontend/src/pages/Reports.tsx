import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

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

const emptyCards: ReportCardData = {
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
};

export default function Reports() {
  const [data, setData] = useState<ReportsResponse>({
    cards: emptyCards,
    premiumByStatus: [],
    claimsByStatus: [],
    policiesByStatus: [],
    commissionByRole: [],
    premiumByMonth: [],
  });

  const [loading, setLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<ReportsResponse>("/reports");

      setTimeout(() => {
        setData(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Reports load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Reports load failed");
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <MainLayout
      title="Reports & Analytics"
      subtitle="Live MongoDB reports for customers, policies, premiums, claims and commission"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">BUSINESS INTELLIGENCE</span><h2>Insurance performance reports</h2><p>Track policy, premium, claims and commission performance from live operational data.</p></div><button className="mini-btn" onClick={loadReports}>Refresh reports</button></div>

      {loading && <div className="dashboard-loading"><span className="checkout-spinner" />Refreshing business reports...</div>}

      <div className="cards admin-report-grid">
        <div className="card">
          <h3>Total Customers</h3>
          <h1>{data.cards.totalCustomers}</h1>
        </div>

        <div className="card">
          <h3>Total Policies</h3>
          <h1>{data.cards.totalPolicies}</h1>
        </div>

        <div className="card">
          <h3>Total Premium Records</h3>
          <h1>{data.cards.totalPremiums}</h1>
        </div>

        <div className="card">
          <h3>Total Claims</h3>
          <h1>{data.cards.totalClaims}</h1>
        </div>

        <div className="card">
          <h3>Total Employees</h3>
          <h1>{data.cards.totalEmployees}</h1>
        </div>

        <div className="card">
          <h3>Total Commissions</h3>
          <h1>{data.cards.totalCommissions}</h1>
        </div>

        <div className="card">
          <h3>Paid Premium</h3>
          <h1>₹{Number(data.cards.paidPremiumAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Due Premium</h3>
          <h1>₹{Number(data.cards.duePremiumAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Active Policies</h3>
          <h1>{data.cards.activePolicies}</h1>
        </div>

        <div className="card">
          <h3>Pending Claims</h3>
          <h1>{data.cards.pendingClaims}</h1>
        </div>

        <div className="card">
          <h3>Paid Commission</h3>
          <h1>₹{Number(data.cards.paidCommissionAmount || 0).toLocaleString("en-IN")}</h1>
        </div>

        <div className="card">
          <h3>Pending Commission</h3>
          <h1>₹{Number(data.cards.pendingCommissionAmount || 0).toLocaleString("en-IN")}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Premium Status Report</h2>

        {data.premiumByStatus.length === 0 ? (
          <p>No premium data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Records</th>
                <th>Total Amount</th>
              </tr>
            </thead>

            <tbody>
              {data.premiumByStatus.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Claims Status Report</h2>

        {data.claimsByStatus.length === 0 ? (
          <p>No claims data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Claims</th>
                <th>Total Claim Amount</th>
              </tr>
            </thead>

            <tbody>
              {data.claimsByStatus.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Policy Status Report</h2>

        {data.policiesByStatus.length === 0 ? (
          <p>No policy data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Policies</th>
              </tr>
            </thead>

            <tbody>
              {data.policiesByStatus.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Commission By Role</h2>

        {data.commissionByRole.length === 0 ? (
          <p>No commission data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Records</th>
                <th>Total Commission</th>
              </tr>
            </thead>

            <tbody>
              {data.commissionByRole.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Premium By Month</h2>

        {data.premiumByMonth.length === 0 ? (
          <p>No monthly premium data found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Records</th>
                <th>Total Premium</th>
              </tr>
            </thead>

            <tbody>
              {data.premiumByMonth.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.count}</td>
                  <td>₹{Number(item.total || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}