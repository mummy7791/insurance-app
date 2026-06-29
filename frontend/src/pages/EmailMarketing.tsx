import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type EmailStatus = "Sent" | "Failed";
type EmailType = "Single" | "Bulk" | "Premium" | "Renewal" | "Lead" | "Claim";

type EmailHistory = {
  _id: string;
  to: string;
  subject: string;
  message: string;
  type: EmailType;
  status: EmailStatus;
  error?: string;
  createdAt?: string;
};

type BulkResponse = {
  message: string;
  total: number;
  sent: number;
  failed: number;
};

const templates = {
  premium:
    "Dear Customer,<br/><br/>Your premium payment is due. Please complete the payment to keep your policy active.<br/><br/>Thank you,<br/>LifeSecure CRM",
  renewal:
    "Dear Customer,<br/><br/>Your policy renewal is coming soon. Please renew before expiry to continue your insurance benefits.<br/><br/>Thank you,<br/>LifeSecure CRM",
  lead:
    "Dear Customer,<br/><br/>Thank you for your interest in our insurance plans. Our advisor will contact you shortly.<br/><br/>Thank you,<br/>LifeSecure CRM",
  claim:
    "Dear Customer,<br/><br/>Your claim request has been received. Our team will review and update you soon.<br/><br/>Thank you,<br/>LifeSecure CRM",
};

export default function EmailMarketing() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<EmailHistory[]>("/email-marketing/history");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Email history load error:", error);
      alert("Email history load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  const sendSingleEmail = async () => {
    if (!to || !subject || !message) {
      alert("To, Subject and Message required");
      return;
    }

    try {
      setSending(true);

      await api.post("/email-marketing/send", {
        to,
        subject,
        message,
        type: "Single",
      });

      alert("Email sent successfully");
      setTo("");
      setSubject("");
      setMessage("");

      void loadHistory();
    } catch (error) {
      console.error("Email send error:", error);
      alert("Email send failed");
      void loadHistory();
    } finally {
      setSending(false);
    }
  };

  const sendBulkCustomers = async () => {
    if (!subject || !message) {
      alert("Subject and Message required");
      return;
    }

    if (!window.confirm("Send email to all customers?")) return;

    try {
      setSending(true);

      const res = await api.post<BulkResponse>(
        "/email-marketing/bulk-customers",
        { subject, message }
      );

      alert(`Bulk completed. Sent: ${res.data.sent}, Failed: ${res.data.failed}`);
      void loadHistory();
    } catch (error) {
      console.error("Bulk customer email error:", error);
      alert("Bulk customer email failed");
    } finally {
      setSending(false);
    }
  };

  const sendBulkLeads = async () => {
    if (!subject || !message) {
      alert("Subject and Message required");
      return;
    }

    if (!window.confirm("Send email to all leads?")) return;

    try {
      setSending(true);

      const res = await api.post<BulkResponse>("/email-marketing/bulk-leads", {
        subject,
        message,
      });

      alert(`Bulk completed. Sent: ${res.data.sent}, Failed: ${res.data.failed}`);
      void loadHistory();
    } catch (error) {
      console.error("Bulk lead email error:", error);
      alert("Bulk lead email failed");
    } finally {
      setSending(false);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!window.confirm("Delete this email history?")) return;

    try {
      await api.delete(`/email-marketing/history/${id}`);
      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Delete email history error:", error);
      alert("Delete failed");
    }
  };

  const applyTemplate = (type: keyof typeof templates) => {
    if (type === "premium") {
      setSubject("Premium Payment Reminder");
    }

    if (type === "renewal") {
      setSubject("Policy Renewal Reminder");
    }

    if (type === "lead") {
      setSubject("Insurance Plan Follow-up");
    }

    if (type === "claim") {
      setSubject("Claim Status Update");
    }

    setMessage(templates[type]);
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const text = `${item.to} ${item.subject} ${item.type} ${item.status}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [history, search]);

  return (
    <MainLayout
      title="Email Marketing"
      subtitle="Send single emails, bulk campaigns and view email history"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Emails</h3>
          <h1>{history.length}</h1>
        </div>

        <div className="card">
          <h3>Sent</h3>
          <h1>{history.filter((item) => item.status === "Sent").length}</h1>
        </div>

        <div className="card">
          <h3>Failed</h3>
          <h1>{history.filter((item) => item.status === "Failed").length}</h1>
        </div>

        <div className="card">
          <h3>Bulk Emails</h3>
          <h1>{history.filter((item) => item.type === "Bulk").length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Email Templates</h2>

        <div className="form-grid">
          <button className="mini-btn" onClick={() => applyTemplate("premium")}>
            Premium Reminder
          </button>

          <button className="mini-btn" onClick={() => applyTemplate("renewal")}>
            Renewal Reminder
          </button>

          <button className="mini-btn" onClick={() => applyTemplate("lead")}>
            Lead Follow-up
          </button>

          <button className="mini-btn" onClick={() => applyTemplate("claim")}>
            Claim Update
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Send Email</h2>

        <div className="form-grid">
          <input
            type="email"
            placeholder="To email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          <input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <textarea
          placeholder="Message supports HTML like <br/>"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          style={{ width: "100%", marginTop: 12 }}
        />

        <div style={{ marginTop: 12 }}>
          <button className="btn small-btn" onClick={sendSingleEmail} disabled={sending}>
            {sending ? "Sending..." : "Send Single Email"}
          </button>

          <button
            className="btn small-btn"
            onClick={sendBulkCustomers}
            disabled={sending}
            style={{ marginLeft: 10 }}
          >
            Send to All Customers
          </button>

          <button
            className="btn small-btn"
            onClick={sendBulkLeads}
            disabled={sending}
            style={{ marginLeft: 10 }}
          >
            Send to All Leads
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Email History</h2>

        <div className="form-grid">
          <input
            placeholder="Search email, subject, type, status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="mini-btn" onClick={loadHistory}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading email history...</p>
        ) : filteredHistory.length === 0 ? (
          <p>No email history found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>To</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Error</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item._id}>
                  <td>{item.to}</td>
                  <td>{item.subject}</td>
                  <td>{item.type}</td>
                  <td>
                    <span
                      className={
                        item.status === "Sent"
                          ? "badge success-badge"
                          : "badge danger-badge"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.error || "N/A"}</td>
                  <td>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "N/A"}
                  </td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => void deleteHistory(item._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}