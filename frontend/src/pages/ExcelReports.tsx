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

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

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

  const downloadCsv = (fileName: string, rows: CsvRow[]) => {
    if (rows.length === 0) {
      rows = [{ Status: "No Data" }];
    }

    const headers = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row)))
    );

    const escapeCsv = (value: CsvValue) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map((header) => escapeCsv(header)).join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCsv(row[header])).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const getSummaryRows = (): CsvRow[] => [
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
  ];

  const exportSummary = () => {
    downloadCsv("summary-report.csv", getSummaryRows());
  };

  const exportPremium = () => {
    const statusRows: CsvRow[] =
      reports.premiumByStatus.length > 0
        ? reports.premiumByStatus.map((item) => ({
            Section: "Premium Status",
            Status: item._id,
            Records: item.count,
            TotalAmount: item.total || 0,
          }))
        : [
            {
              Section: "Premium Status",
              Status: "No Data",
              Records: 0,
              TotalAmount: 0,
            },
          ];

    const monthRows: CsvRow[] =
      reports.premiumByMonth.length > 0
        ? reports.premiumByMonth.map((item) => ({
            Section: "Premium Month",
            Month: item._id,
            Records: item.count,
            TotalPremium: item.total,
          }))
        : [
            {
              Section: "Premium Month",
              Month: "No Data",
              Records: 0,
              TotalPremium: 0,
            },
          ];

    downloadCsv("premium-report.csv", [...statusRows, ...monthRows]);
  };

  const exportClaims = () => {
    const rows: CsvRow[] =
      reports.claimsByStatus.length > 0
        ? reports.claimsByStatus.map((item) => ({
            Status: item._id,
            Claims: item.count,
            ClaimAmount: item.total || 0,
          }))
        : [{ Status: "No Data", Claims: 0, ClaimAmount: 0 }];

    downloadCsv("claims-report.csv", rows);
  };

  const exportCommission = () => {
    const rows: CsvRow[] =
      reports.commissionByRole.length > 0
        ? reports.commissionByRole.map((item) => ({
            Role: item._id,
            Records: item.count,
            TotalCommission: item.total,
          }))
        : [{ Role: "No Data", Records: 0, TotalCommission: 0 }];

    downloadCsv("commission-report.csv", rows);
  };

  const exportAll = () => {
    const rows: CsvRow[] = [
      ...getSummaryRows().map((row) => ({
        Section: "Summary",
        ...row,
      })),
      ...reports.premiumByStatus.map((item) => ({
        Section: "Premium Status",
        Status: item._id,
        Records: item.count,
        TotalAmount: item.total || 0,
      })),
      ...reports.claimsByStatus.map((item) => ({
        Section: "Claims Status",
        Status: item._id,
        Records: item.count,
        TotalAmount: item.total || 0,
      })),
      ...reports.commissionByRole.map((item) => ({
        Section: "Commission Role",
        Role: item._id,
        Records: item.count,
        TotalAmount: item.total,
      })),
      ...reports.premiumByMonth.map((item) => ({
        Section: "Premium Month",
        Month: item._id,
        Records: item.count,
        TotalAmount: item.total,
      })),
    ];

    downloadCsv("all-reports.csv", rows);
  };

  return (
    <MainLayout
      title="Reports"
      subtitle="Export insurance reports as CSV files compatible with Excel"
    >
      <button className="mini-btn" onClick={loadReports}>
        Refresh Reports
      </button>

      {loading && <p>Loading reports...</p>}

      <div className="cards">
        <div className="card">
          <h3>Summary Report</h3>
          <h1>{reports.cards.totalCustomers}</h1>
          <button className="mini-btn" onClick={exportSummary}>
            Download CSV
          </button>
        </div>

        <div className="card">
          <h3>Premium Report</h3>
          <h1>₹{reports.cards.paidPremiumAmount}</h1>
          <button className="mini-btn" onClick={exportPremium}>
            Download CSV
          </button>
        </div>

        <div className="card">
          <h3>Claims Report</h3>
          <h1>{reports.cards.totalClaims}</h1>
          <button className="mini-btn" onClick={exportClaims}>
            Download CSV
          </button>
        </div>

        <div className="card">
          <h3>Commission Report</h3>
          <h1>₹{reports.cards.paidCommissionAmount}</h1>
          <button className="mini-btn" onClick={exportCommission}>
            Download CSV
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Export All Reports</h2>

        <p>
          Download summary, premium, claims, commission and monthly report
          data in one CSV file.
        </p>

        <button className="btn small-btn" onClick={exportAll}>
          Download All Reports
        </button>
      </div>

      <div className="section">
        <h2>Available Reports</h2>

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
              <td>summary-report.csv</td>
              <td>
                <button className="mini-btn" onClick={exportSummary}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Premium</td>
              <td>Premium status and monthly report</td>
              <td>premium-report.csv</td>
              <td>
                <button className="mini-btn" onClick={exportPremium}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Claims</td>
              <td>Claims status report</td>
              <td>claims-report.csv</td>
              <td>
                <button className="mini-btn" onClick={exportClaims}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Commission</td>
              <td>Role-wise commission report</td>
              <td>commission-report.csv</td>
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
