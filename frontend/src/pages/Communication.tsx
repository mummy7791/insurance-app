import { useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type EmailForm = {
  to: string;
  subject: string;
  message: string;
};

const initialForm: EmailForm = {
  to: "",
  subject: "",
  message: "",
};

export default function Communication() {
  const [form, setForm] = useState<EmailForm>(initialForm);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const sendEmail = async () => {
    if (!form.to || !form.subject || !form.message) {
      alert("To Email, Subject, Message required");
      return;
    }

    try {
      setSending(true);

      await api.post("/email/send", {
        to: form.to,
        subject: form.subject,
        message: form.message,
      });

      setSentCount((prev) => prev + 1);
      setForm(initialForm);
      alert("Email sent successfully");
    } catch (error) {
      console.error("Email send error:", error);
      alert("Email send failed. Check backend and Gmail App Password.");
    } finally {
      setSending(false);
    }
  };

  const loadPremiumTemplate = () => {
    setForm((prev) => ({
      ...prev,
      subject: "Premium Payment Reminder",
      message:
        "Dear Customer,\n\nThis is a reminder that your insurance premium payment is due. Please complete the payment to keep your policy active.\n\nRegards,\nLifeSecure CRM",
    }));
  };

  const loadKycTemplate = () => {
    setForm((prev) => ({
      ...prev,
      subject: "KYC Document Pending",
      message:
        "Dear Customer,\n\nYour KYC documents are pending for verification. Please submit Aadhaar, PAN and required documents at the earliest.\n\nRegards,\nLifeSecure CRM",
    }));
  };

  const loadClaimTemplate = () => {
    setForm((prev) => ({
      ...prev,
      subject: "Claim Status Update",
      message:
        "Dear Customer,\n\nThis is to inform you that your claim request is currently under process. We will update you once the verification is completed.\n\nRegards,\nLifeSecure CRM",
    }));
  };

  return (
    <MainLayout
      title="Communication"
      subtitle="Send premium reminders, KYC alerts and claim updates by email"
    >
      <div className="cards">
        <div className="card">
          <h3>Email Service</h3>
          <h1>Active</h1>
        </div>

        <div className="card">
          <h3>Sent This Session</h3>
          <h1>{sentCount}</h1>
        </div>

        <div className="card">
          <h3>Provider</h3>
          <h1>Gmail</h1>
        </div>

        <div className="card">
          <h3>Status</h3>
          <h1>{sending ? "Sending" : "Ready"}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Send Email</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Email"
            value={form.to}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, to: e.target.value }))
            }
          />

          <input
            placeholder="Subject"
            value={form.subject}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, subject: e.target.value }))
            }
          />
        </div>

        <textarea
          className="text-area"
          placeholder="Message"
          value={form.message}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, message: e.target.value }))
          }
        />

        <button className="btn small-btn" onClick={sendEmail} disabled={sending}>
          {sending ? "Sending..." : "Send Email"}
        </button>
      </div>

      <div className="section">
        <h2>Email Templates</h2>

        <div className="cards">
          <div className="card">
            <h3>Premium Reminder</h3>
            <p>Send payment due reminder to customer.</p>
            <button className="mini-btn" onClick={loadPremiumTemplate}>
              Use Template
            </button>
          </div>

          <div className="card">
            <h3>KYC Pending</h3>
            <p>Ask customer to submit KYC documents.</p>
            <button className="mini-btn" onClick={loadKycTemplate}>
              Use Template
            </button>
          </div>

          <div className="card">
            <h3>Claim Update</h3>
            <p>Send claim processing status update.</p>
            <button className="mini-btn" onClick={loadClaimTemplate}>
              Use Template
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}