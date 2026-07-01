import { useState } from "react";
import "../styles/app.css";

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

  const assignPolicy = async () => {
    if (!form.name || !form.email || !form.policyNo || !form.planName) {
      alert("Name, Email, Policy No, Plan Name required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        members: form.members
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      };

      const res = await fetch("http://localhost:5000/customer/assign-policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Policy assign failed");
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
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <h1>Assign Policy to Customer</h1>

      <div className="form-grid">
        <input placeholder="Customer Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Customer Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <input placeholder="DOB" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option>Female</option>
          <option>Male</option>
          <option>Other</option>
        </select>
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

        <input placeholder="Aadhaar Masked" value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} />
        <input placeholder="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} />
        <input placeholder="Nominee" value={form.nominee} onChange={(e) => setForm({ ...form, nominee: e.target.value })} />

        <input placeholder="Nominee Relation" value={form.nomineeRelation} onChange={(e) => setForm({ ...form, nomineeRelation: e.target.value })} />
        <input placeholder="Advisor / Unit Manager" value={form.advisor} onChange={(e) => setForm({ ...form, advisor: e.target.value })} />
        <input placeholder="Agency Manager" value={form.agencyManager} onChange={(e) => setForm({ ...form, agencyManager: e.target.value })} />

        <input placeholder="Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
        <input placeholder="Plan Name" value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} />
        <input placeholder="Policy Number" value={form.policyNo} onChange={(e) => setForm({ ...form, policyNo: e.target.value })} />

        <select value={form.policyType} onChange={(e) => setForm({ ...form, policyType: e.target.value })}>
          <option>Health Insurance</option>
          <option>Motor Insurance</option>
          <option>Travel Insurance</option>
          <option>Life Insurance</option>
          <option>SME Insurance</option>
        </select>

        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>ACTIVE</option>
          <option>PENDING</option>
          <option>EXPIRED</option>
          <option>RENEWAL DUE</option>
        </select>

        <input placeholder="Premium ₹12,500 / Year" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} />

        <input placeholder="Coverage ₹10,00,000" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} />
        <input placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input placeholder="Expiry Date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />

        <input placeholder="Renewal Date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} />
        <input placeholder="Members Self, Spouse, Mother" value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} />
        <input placeholder="Last Payment" value={form.lastPayment} onChange={(e) => setForm({ ...form, lastPayment: e.target.value })} />

        <input placeholder="Next Premium" value={form.nextPremium} onChange={(e) => setForm({ ...form, nextPremium: e.target.value })} />

        <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
          <option>UPI</option>
          <option>Card</option>
          <option>Net Banking</option>
          <option>Cash</option>
          <option>Cheque</option>
        </select>

        <input placeholder="Transaction ID" value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} />
      </div>

      <button className="btn small-btn" onClick={assignPolicy} disabled={loading}>
        {loading ? "Assigning..." : "Assign Policy"}
      </button>
    </div>
  );
}