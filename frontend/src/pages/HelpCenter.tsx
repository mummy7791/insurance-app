import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

export default function HelpCenter() {
  const [query, setQuery] = useState("");
  const faqs = [
    ["How do I verify my email?", "After registration, enter the 6-digit OTP sent to your registered email. You can resend a fresh OTP from the verification screen."],
    ["How do I buy a policy?", "Open Insurance Plans, review the cover and premium, then continue to secure payment. Your policy appears in My Policies after successful payment."],
    ["Where can I track a claim?", "Open Claims to submit a request and view its latest status, amount and remarks."],
    ["How do I upload KYC?", "Open Documents / KYC, select the document type and upload the requested file securely."],
  ];
  const filtered = faqs.filter(([q, a]) => (q + " " + a).toLowerCase().includes(query.toLowerCase()));
  return <MainLayout title="Help & Support" subtitle="Policyholder assistance and self-service help">
    <div className="support-hero"><div><span className="eyebrow">CUSTOMER CARE</span><h1>How can we help?</h1><p>Find quick answers for account verification, policies, payments, claims and KYC.</p></div><div className="support-icon">?</div></div>
    <div className="section support-search"><input aria-label="Search help" placeholder="Search help topics..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="support-grid">
      <Link to="/policies" className="support-action"><span>📑</span><strong>My Policies</strong><small>View active cover and certificates</small></Link>
      <Link to="/premiums" className="support-action"><span>💳</span><strong>Premiums</strong><small>Check payment history</small></Link>
      <Link to="/claims" className="support-action"><span>🧾</span><strong>Claims</strong><small>Submit and track requests</small></Link>
      <Link to="/documents" className="support-action"><span>🔐</span><strong>KYC Vault</strong><small>Manage secure documents</small></Link>
    </div>
    <div className="section"><div className="section-heading-row"><div><span className="eyebrow">FREQUENTLY ASKED</span><h2>Quick answers</h2></div><span className="secure-chip">Self service</span></div>
      <div className="faq-list">{filtered.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}{filtered.length === 0 && <p>No matching help topic found.</p>}</div>
    </div>
  </MainLayout>;
}