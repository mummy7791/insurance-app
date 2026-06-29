import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
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

export default function ExcelReports() {
  const [reports, setReports] = useState<ReportsResponse>(emptyReports);
  const [loading, setLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<ReportsResponse>("/reports");

      setTimeout(() => {
        setReports(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Reports load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Reports load failed");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadReports();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadReports]);

  const downloadExcel = (
    fileName: string,
    sheets: { sheetName: string; rows: Record<string, string | number>[] }[]
  ) => {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
    });

    XLSX.writeFile(workbook, fileName);
  };

  const exportSummary = () => {
    downloadExcel("summary-report.xlsx", [
      {
        sheetName: "Summary",
        rows: [
          { Metric: "Total Customers", Value: reports.cards.totalCustomers },
          { Metric: "Total Policies", Value: reports.cards.totalPolicies },
          { Metric: "Total Premium Records", Value: reports.cards.totalPremiums },
          { Metric: "Total Claims", Value: reports.cards.totalClaims },
          { Metric: "Total Employees", Value: reports.cards.totalEmployees },
          { Metric: "Total Commissions", Value: reports.cards.totalCommissions },
          { Metric: "Paid Premium Amount", Value: reports.cards.paidPremiumAmount },
          { Metric: "Due Premium Amount", Value: reports.cards.duePremiumAmount },
          { Metric: "Active Policies", Value: reports.cards.activePolicies },
          { Metric: "Pending Claims", Value: reports.cards.pendingClaims },
          {
            Metric: "Paid Commission Amount",
            Value: reports.cards.paidCommissionAmount,
          },
          {
            Metric: "Pending Commission Amount",
            Value: reports.cards.pendingCommissionAmount,
          },
        ],
      },
    ]);
  };

  const exportPremium = () => {
    downloadExcel("premium-report.xlsx", [
      {
        sheetName: "Premium Status",
        rows:
          reports.premiumByStatus.length > 0
            ? reports.premiumByStatus.map((item) => ({
                Status: item._id,
                Records: item.count,
                TotalAmount: item.total || 0,
              }))
            : [{ Status: "No Data", Records: 0, TotalAmount: 0 }],
      },
      {
        sheetName: "Premium Month",
        rows:
          reports.premiumByMonth.length > 0
            ? reports.premiumByMonth.map((item) => ({
                Month: item._id,
                Records: item.count,
                TotalPremium: item.total,
              }))
            : [{ Month: "No Data", Records: 0, TotalPremium: 0 }],
      },
    ]);
  };

  const exportClaims = () => {
    downloadExcel("claims-report.xlsx", [
      {
        sheetName: "Claims",
        rows:
          reports.claimsByStatus.length > 0
            ? reports.claimsByStatus.map((item) => ({
                Status: item._id,
                Claims: item.count,
                ClaimAmount: item.total || 0,
              }))
            : [{ Status: "No Data", Claims: 0, ClaimAmount: 0 }],
      },
    ]);
  };

  const exportCommission = () => {
    downloadExcel("commission-report.xlsx", [
      {
        sheetName: "Commission",
        rows:
          reports.commissionByRole.length > 0
            ? reports.commissionByRole.map((item) => ({
                Role: item._id,
                Records: item.count,
                TotalCommission: item.total,
              }))
            : [{ Role: "No Data", Records: 0, TotalCommission: 0 }],
      },
    ]);
  };

  const exportAll = () => {
    downloadExcel("all-reports.xlsx", [
      {
        sheetName: "Summary",
        rows: [
          { Metric: "Total Customers", Value: reports.cards.totalCustomers },
          { Metric: "Total Policies", Value: reports.cards.totalPolicies },
          { Metric: "Total Premium Records", Value: reports.cards.totalPremiums },
          { Metric: "Total Claims", Value: reports.cards.totalClaims },
          { Metric: "Total Employees", Value: reports.cards.totalEmployees },
          { Metric: "Total Commissions", Value: reports.cards.totalCommissions },
          { Metric: "Paid Premium Amount", Value: reports.cards.paidPremiumAmount },
          { Metric: "Due Premium Amount", Value: reports.cards.duePremiumAmount },
          {
            Metric: "Paid Commission Amount",
            Value: reports.cards.paidCommissionAmount,
          },
          {
            Metric: "Pending Commission Amount",
            Value: reports.cards.pendingCommissionAmount,
          },
        ],
      },
      {
        sheetName: "Premium Status",
        rows: reports.premiumByStatus.map((item) => ({
          Status: item._id,
          Records: item.count,
          TotalAmount: item.total || 0,
        })),
      },
      {
        sheetName: "Claims Status",
        rows: reports.claimsByStatus.map((item) => ({
          Status: item._id,
          Claims: item.count,
          ClaimAmount: item.total || 0,
        })),
      },
      {
        sheetName: "Commission Role",
        rows: reports.commissionByRole.map((item) => ({
          Role: item._id,
          Records: item.count,
          TotalCommission: item.total,
        })),
      },
      {
        sheetName: "Premium Month",
        rows: reports.premiumByMonth.map((item) => ({
          Month: item._id,
          Records: item.count,
          TotalPremium: item.total,
        })),
      },
    ]);
  };

  return (
    <MainLayout
      title="Excel Reports"
      subtitle="Export MongoDB reports as Excel files"
    >
      <button className="mini-btn" onClick={loadReports}>
        Refresh Reports
      </button>

      {loading && <p>Loading reports...</p>}

      <div className="cards">
        <div className="card">
          <h3>Summary Excel</h3>
          <h1>{reports.cards.totalCustomers}</h1>
          <button className="mini-btn" onClick={exportSummary}>
            Download
          </button>
        </div>

        <div className="card">
          <h3>Premium Excel</h3>
          <h1>₹{reports.cards.paidPremiumAmount}</h1>
          <button className="mini-btn" onClick={exportPremium}>
            Download
          </button>
        </div>

        <div className="card">
          <h3>Claims Excel</h3>
          <h1>{reports.cards.totalClaims}</h1>
          <button className="mini-btn" onClick={exportClaims}>
            Download
          </button>
        </div>

        <div className="card">
          <h3>Commission Excel</h3>
          <h1>₹{reports.cards.paidCommissionAmount}</h1>
          <button className="mini-btn" onClick={exportCommission}>
            Download
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Export All Reports</h2>

        <p>
          Download summary, premium, claims, commission and monthly reports in
          one Excel workbook.
        </p>

        <button className="btn small-btn" onClick={exportAll}>
          Download All Reports
        </button>
      </div>

      <div className="section">
        <h2>Available Excel Reports</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Description</th>
              <th>File</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Summary</td>
              <td>Overall CRM summary</td>
              <td>summary-report.xlsx</td>
              <td>
                <button className="mini-btn" onClick={exportSummary}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Premium</td>
              <td>Premium status and monthly report</td>
              <td>premium-report.xlsx</td>
              <td>
                <button className="mini-btn" onClick={exportPremium}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Claims</td>
              <td>Claims status report</td>
              <td>claims-report.xlsx</td>
              <td>
                <button className="mini-btn" onClick={exportClaims}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Commission</td>
              <td>Role-wise commission report</td>
              <td>commission-report.xlsx</td>
              <td>
                <button className="mini-btn" onClick={exportCommission}>
                  Download
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}