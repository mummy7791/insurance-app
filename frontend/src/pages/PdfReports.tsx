import { useCallback, useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export default function PdfReports() {
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

  const addTitle = (doc: jsPDF, title: string) => {
    doc.setFontSize(18);
    doc.text(title, 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
  };

  const downloadSummaryReport = () => {
    const doc = new jsPDF();

    addTitle(doc, "LifeSecure CRM - Summary Report");

    autoTable(doc, {
      startY: 35,
      head: [["Metric", "Value"]],
      body: [
        ["Total Customers", String(reports.cards.totalCustomers)],
        ["Total Policies", String(reports.cards.totalPolicies)],
        ["Total Premium Records", String(reports.cards.totalPremiums)],
        ["Total Claims", String(reports.cards.totalClaims)],
        ["Total Employees", String(reports.cards.totalEmployees)],
        ["Total Commissions", String(reports.cards.totalCommissions)],
        ["Paid Premium Amount", `Rs. ${reports.cards.paidPremiumAmount}`],
        ["Due Premium Amount", `Rs. ${reports.cards.duePremiumAmount}`],
        ["Active Policies", String(reports.cards.activePolicies)],
        ["Pending Claims", String(reports.cards.pendingClaims)],
        ["Paid Commission", `Rs. ${reports.cards.paidCommissionAmount}`],
        ["Pending Commission", `Rs. ${reports.cards.pendingCommissionAmount}`],
      ],
    });

    doc.save("summary-report.pdf");
  };

  const downloadPremiumReport = () => {
    const doc = new jsPDF();

    addTitle(doc, "LifeSecure CRM - Premium Report");

    autoTable(doc, {
      startY: 35,
      head: [["Status", "Records", "Total Amount"]],
      body:
        reports.premiumByStatus.length > 0
          ? reports.premiumByStatus.map((item) => [
              item._id,
              String(item.count),
              `Rs. ${item.total || 0}`,
            ])
          : [["No Data", "0", "Rs. 0"]],
    });

    autoTable(doc, {
      startY: 95,
      head: [["Month", "Records", "Total Premium"]],
      body:
        reports.premiumByMonth.length > 0
          ? reports.premiumByMonth.map((item) => [
              item._id,
              String(item.count),
              `Rs. ${item.total}`,
            ])
          : [["No Data", "0", "Rs. 0"]],
    });

    doc.save("premium-report.pdf");
  };

  const downloadClaimsReport = () => {
    const doc = new jsPDF();

    addTitle(doc, "LifeSecure CRM - Claims Report");

    autoTable(doc, {
      startY: 35,
      head: [["Status", "Claims", "Claim Amount"]],
      body:
        reports.claimsByStatus.length > 0
          ? reports.claimsByStatus.map((item) => [
              item._id,
              String(item.count),
              `Rs. ${item.total || 0}`,
            ])
          : [["No Data", "0", "Rs. 0"]],
    });

    doc.save("claims-report.pdf");
  };

  const downloadCommissionReport = () => {
    const doc = new jsPDF();

    addTitle(doc, "LifeSecure CRM - Commission Report");

    autoTable(doc, {
      startY: 35,
      head: [["Role", "Records", "Total Commission"]],
      body:
        reports.commissionByRole.length > 0
          ? reports.commissionByRole.map((item) => [
              item._id,
              String(item.count),
              `Rs. ${item.total}`,
            ])
          : [["No Data", "0", "Rs. 0"]],
    });

    doc.save("commission-report.pdf");
  };

  return (
    <MainLayout
      title="PDF Reports"
      subtitle="Download real MongoDB reports as PDF"
    >
      <button className="mini-btn" onClick={loadReports}>
        Refresh Reports
      </button>

      {loading && <p>Loading reports...</p>}

      <div className="cards">
        <div className="card">
          <h3>Summary Report</h3>
          <h1>{reports.cards.totalCustomers}</h1>
          <button className="mini-btn" onClick={downloadSummaryReport}>
            Download PDF
          </button>
        </div>

        <div className="card">
          <h3>Premium Report</h3>
          <h1>₹{reports.cards.paidPremiumAmount}</h1>
          <button className="mini-btn" onClick={downloadPremiumReport}>
            Download PDF
          </button>
        </div>

        <div className="card">
          <h3>Claims Report</h3>
          <h1>{reports.cards.totalClaims}</h1>
          <button className="mini-btn" onClick={downloadClaimsReport}>
            Download PDF
          </button>
        </div>

        <div className="card">
          <h3>Commission Report</h3>
          <h1>₹{reports.cards.paidCommissionAmount}</h1>
          <button className="mini-btn" onClick={downloadCommissionReport}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Available PDF Reports</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Summary Report</td>
              <td>Customers, policies, premiums, claims and commission summary</td>
              <td>
                <button className="mini-btn" onClick={downloadSummaryReport}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Premium Report</td>
              <td>Premium by status and monthly premium report</td>
              <td>
                <button className="mini-btn" onClick={downloadPremiumReport}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Claims Report</td>
              <td>Claims status and claim amount report</td>
              <td>
                <button className="mini-btn" onClick={downloadClaimsReport}>
                  Download
                </button>
              </td>
            </tr>

            <tr>
              <td>Commission Report</td>
              <td>Role-wise commission report</td>
              <td>
                <button className="mini-btn" onClick={downloadCommissionReport}>
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