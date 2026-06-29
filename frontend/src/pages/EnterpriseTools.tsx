import MainLayout from "../layouts/MainLayout";

const API = "http://localhost:5000/api/quick-enterprise";

export default function EnterpriseTools() {
  return (
    <MainLayout
      title="Enterprise CRM Tools"
      subtitle="AI + PDF + Excel + QR + KYC + Reports"
    >
      {/* Dashboard Cards */}
      <div className="cards">
        <div className="card">
          <h3>📄 PDF</h3>
          <p>Policy Documents</p>
        </div>

        <div className="card">
          <h3>📊 Excel</h3>
          <p>Export Customers</p>
        </div>

        <div className="card">
          <h3>🔐 KYC</h3>
          <p>Approve Documents</p>
        </div>

        <div className="card">
          <h3>🤖 AI</h3>
          <p>Customer Churn</p>
        </div>

        <div className="card">
          <h3>📱 QR</h3>
          <p>Verify Policy</p>
        </div>

        <div className="card">
          <h3>📈 Reports</h3>
          <p>Analytics</p>
        </div>
      </div>

      {/* PDF */}
      <div className="section">
        <h2>📄 PDF Tools</h2>

        <div className="form-grid">
          <a
            className="btn"
            href={`${API}/pdf-report`}
            target="_blank"
            rel="noreferrer"
          >
            Download CRM PDF Report
          </a>

          <a
            className="btn"
            href={`${API}/policy-pdf/REPLACE_POLICY_ID`}
            target="_blank"
            rel="noreferrer"
          >
            Generate Policy PDF
          </a>

          <a
            className="btn"
            href={`${API}/receipt/REPLACE_PREMIUM_ID`}
            target="_blank"
            rel="noreferrer"
          >
            Payment Receipt
          </a>
        </div>
      </div>

      {/* Excel */}
      <div className="section">
        <h2>📊 Excel</h2>

        <div className="form-grid">
          <a
            className="btn"
            href={`${API}/export/customers`}
            target="_blank"
            rel="noreferrer"
          >
            Export Customers
          </a>
        </div>
      </div>

      {/* QR */}
      <div className="section">
        <h2>📱 QR Code</h2>

        <div className="form-grid">
          <a
            className="btn"
            href={`${API}/policy-qr/REPLACE_POLICY_ID`}
            target="_blank"
            rel="noreferrer"
          >
            Generate Policy QR
          </a>
        </div>
      </div>

      {/* AI */}
      <div className="section">
        <h2>🤖 Artificial Intelligence</h2>

        <div className="form-grid">
          <a
            className="btn"
            href={`${API}/churn`}
            target="_blank"
            rel="noreferrer"
          >
            Customer Churn Prediction
          </a>

          <a
            className="btn"
            href={`${API}/document-expiry`}
            target="_blank"
            rel="noreferrer"
          >
            Document Expiry Alerts
          </a>
        </div>
      </div>

      {/* KYC */}
      <div className="section">
        <h2>🔐 KYC Management</h2>

        <p>
          Customer Details page nundi
          <br />
          Approve / Reject KYC cheyyachu.
        </p>
      </div>

      {/* Reports */}
      <div className="section">
        <h2>📈 Reports</h2>

        <div className="form-grid">
          <a
            className="btn"
            href={`${API}/branches-summary`}
            target="_blank"
            rel="noreferrer"
          >
            Branch Summary
          </a>

          <a
            className="btn"
            href={`${API}/companies-summary`}
            target="_blank"
            rel="noreferrer"
          >
            Company Summary
          </a>

          <a
            className="btn"
            href={`${API}/permissions`}
            target="_blank"
            rel="noreferrer"
          >
            User Permissions
          </a>
        </div>
      </div>
    </MainLayout>
  );
}