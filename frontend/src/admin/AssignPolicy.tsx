import { useState } from "react";
import "../styles/app.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://insurance-app-7vkn.onrender.com";

export default function AssignPolicy() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "Female",
    address: "",
    aadhaar: "",
    pan: "",
    nominee: "",
    nomineeRelation: "",
    advisor: "",
    agencyManager: "",
    branch: "",
    planName: "Health Elevate Gold",
    policyNo: "",
    policyType: "Health Insurance",
    status: "ACTIVE",
    premium: "",
    coverage: "",
    startDate: "",
    expiryDate: "",
    renewalDate: "",
    members: "Self",
    lastPayment: "",
    nextPremium: "",
    paymentMode: "UPI",
    transactionId: "",
  });

  const [loading, setLoading] = useState(false);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const assignPolicy = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.policyNo.trim() || !form.planName.trim()) {
      alert("Name, Email, Policy No, Plan Name required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        members: form.members
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      };

      const res = await fetch(`${API_BASE_URL}/customer/assign-policy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      let data: { message?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || "Invalid server response" };
      }

      if (!res.ok) {
        alert(data.message || data.error || "Policy assign failed");
        return;
      }

      alert("Policy assigned successfully");

      setForm({
        name: "",
        email: "",
        phone: "",
        dob: "",
        gender: "Female",
        address: "",
        aadhaar: "",
        pan: "",
        nominee: "",
        nomineeRelation: "",
        advisor: "",
        agencyManager: "",
        branch: "",
        planName: "Health Elevate Gold",
        policyNo: "",
        policyType: "Health Insurance",
        status: "ACTIVE",
        premium: "",
        coverage: "",
        startDate: "",
        expiryDate: "",
        renewalDate: "",
        members: "Self",
        lastPayment: "",
        nextPremium: "",
        paymentMode: "UPI",
        transactionId: "",
      });
    } catch (error) {
      console.error("Assign policy error:", error);
      alert("Server error. Check backend URL / Render logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <h1>Assign Policy to Customer</h1>

      <div className="form-grid">
        <input placeholder="Customer Name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
        <input placeholder="Customer Email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />

        <input placeholder="DOB" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
        <select value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
          <option>Female</option>
          <option>Male</option>
          <option>Other</option>
        </select>
        <input placeholder="Address" value={form.address} onChange={(e) => updateForm("address", e.target.value)} />

        <input placeholder="Aadhaar Masked" value={form.aadhaar} onChange={(e) => updateForm("aadhaar", e.target.value)} />
        <input placeholder="PAN" value={form.pan} onChange={(e) => updateForm("pan", e.target.value)} />
        <input placeholder="Nominee" value={form.nominee} onChange={(e) => updateForm("nominee", e.target.value)} />

        <input placeholder="Nominee Relation" value={form.nomineeRelation} onChange={(e) => updateForm("nomineeRelation", e.target.value)} />
        <input placeholder="Advisor / Unit Manager" value={form.advisor} onChange={(e) => updateForm("advisor", e.target.value)} />
        <input placeholder="Agency Manager" value={form.agencyManager} onChange={(e) => updateForm("agencyManager", e.target.value)} />

        <input placeholder="Branch" value={form.branch} onChange={(e) => updateForm("branch", e.target.value)} />
        <input placeholder="Plan Name" value={form.planName} onChange={(e) => updateForm("planName", e.target.value)} />
        <input placeholder="Policy Number" value={form.policyNo} onChange={(e) => updateForm("policyNo", e.target.value)} />

        <select value={form.policyType} onChange={(e) => updateForm("policyType", e.target.value)}>
          <option>Health Insurance</option>
          <option>Motor Insurance</option>
          <option>Travel Insurance</option>
          <option>Life Insurance</option>
          <option>SME Insurance</option>
        </select>

        <select value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
          <option>ACTIVE</option>
          <option>PENDING</option>
          <option>EXPIRED</option>
          <option>RENEWAL DUE</option>
        </select>

        <input placeholder="Premium ₹12,500 / Year" value={form.premium} onChange={(e) => updateForm("premium", e.target.value)} />

        <input placeholder="Coverage ₹10,00,000" value={form.coverage} onChange={(e) => updateForm("coverage", e.target.value)} />
        <input placeholder="Start Date" value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} />
        <input placeholder="Expiry Date" value={form.expiryDate} onChange={(e) => updateForm("expiryDate", e.target.value)} />

        <input placeholder="Renewal Date" value={form.renewalDate} onChange={(e) => updateForm("renewalDate", e.target.value)} />
        <input placeholder="Members Self, Spouse, Mother" value={form.members} onChange={(e) => updateForm("members", e.target.value)} />
        <input placeholder="Last Payment" value={form.lastPayment} onChange={(e) => updateForm("lastPayment", e.target.value)} />

        <input placeholder="Next Premium" value={form.nextPremium} onChange={(e) => updateForm("nextPremium", e.target.value)} />

        <select value={form.paymentMode} onChange={(e) => updateForm("paymentMode", e.target.value)}>
          <option>UPI</option>
          <option>Card</option>
          <option>Net Banking</option>
          <option>Cash</option>
          <option>Cheque</option>
        </select>

        <input placeholder="Transaction ID" value={form.transactionId} onChange={(e) => updateForm("transactionId", e.target.value)} />
      </div>

      <button className="btn small-btn" onClick={assignPolicy} disabled={loading}>
        {loading ? "Assigning..." : "Assign Policy"}
      </button>
    </div>
  );
}