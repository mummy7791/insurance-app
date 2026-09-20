import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Plan = {
  _id: string;
  planName: string;
  category: string;
  yearlyAmount?: number;
  yearlyPremium?: number;
  coverageAmount?: number;
  paymentYears?: number;
  benefits?: string | string[];
  coverage?: string;
  description?: string;
};

type BuyForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  dateOfBirth: string;
  panNumber: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeDateOfBirth: string;
  proposalConsent: boolean;
};

const initialForm: BuyForm = {
  customerName: "", customerEmail: "", customerPhone: "", address: "",
  dateOfBirth: "", panNumber: "", nomineeName: "", nomineeRelation: "",
  nomineeDateOfBirth: "", proposalConsent: false,
};

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
  }
  return fallback;
};

export default function OnlinePolicyPurchase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("plan") || "";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<BuyForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);

  const loadProposal = useCallback(async () => {
    if (!planId) {
      navigate("/insurance-plans", { replace: true });
      return;
    }
    try {
      setLoading(true);
      const [planRes, profileRes] = await Promise.all([
        api.get<Plan>(`/insurance-plans/${planId}`),
        api.get<{ name?: string; email?: string; phone?: string; address?: string }>("/customer-profile"),
      ]);
      setPlan(planRes.data);
      let saved: Partial<BuyForm> = {};
      try {
        const raw = sessionStorage.getItem(`proposal:${planId}`);
        if (raw) {
          saved = JSON.parse(raw) as Partial<BuyForm>;
          setRestored(true);
        }
      } catch {
        sessionStorage.removeItem(`proposal:${planId}`);
      }
      setForm((prev) => ({
        ...prev,
        ...saved,
        customerName: saved.customerName || profileRes.data?.name || "",
        customerEmail: profileRes.data?.email || "",
        customerPhone: saved.customerPhone || profileRes.data?.phone || "",
        address: saved.address || profileRes.data?.address || "",
      }));
    } catch (error) {
      alert(errorMessage(error, "Unable to open this insurance plan"));
      navigate("/insurance-plans", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate, planId]);

  useEffect(() => { void loadProposal(); }, [loadProposal]);

  const update = (field: keyof BuyForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const continueToPayment = () => {
    if (!form.customerName.trim() || !form.customerEmail.trim() || !form.customerPhone.trim() ||
        !form.address.trim() || !form.dateOfBirth || !form.panNumber.trim() ||
        !form.nomineeName.trim() || !form.nomineeRelation || !form.nomineeDateOfBirth ||
        !form.proposalConsent) {
      alert("Please complete all personal, KYC, nominee and consent details");
      return;
    }
    const phoneDigits = form.customerPhone.replace(/\D/g, "");
    const customerDob = new Date(form.dateOfBirth);
    const nomineeDob = new Date(form.nomineeDateOfBirth);
    const today = new Date();
    if (phoneDigits.length < 10 || phoneDigits.length > 15 || Number.isNaN(customerDob.getTime()) || Number.isNaN(nomineeDob.getTime()) || customerDob > today || nomineeDob > today) {
      alert("Enter a valid mobile number and date of birth details");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.trim().toUpperCase())) {
      alert("Enter a valid PAN number");
      return;
    }
    sessionStorage.setItem(`proposal:${planId}`, JSON.stringify({
      ...form,
      panNumber: form.panNumber.trim().toUpperCase(),
      planId,
      savedAt: new Date().toISOString(),
    }));
    navigate(`/payment/${planId}`);
  };

  if (loading) return <MainLayout title="Insurance Proposal" subtitle="Preparing your application"><div className="section"><p>Loading plan and profile...</p></div></MainLayout>;
  if (!plan) return null;

  const premium = Number(plan.yearlyPremium || plan.yearlyAmount || 0);
  const benefits = Array.isArray(plan.benefits) ? plan.benefits.join(" • ") : plan.benefits || plan.coverage || "Protection benefits as per plan terms.";

  return (
    <MainLayout title="Insurance Proposal" subtitle="Review your plan and complete proposal details before payment">
      <div className="payment-progress"><span className="done">1 Plan</span><span className="active">2 Proposal</span><span>3 Payment</span><span>4 Policy active</span></div>

      {restored && <div className="proposal-restored"><strong>Saved proposal restored</strong><span>You can review your details and continue securely.</span></div>}

      <div className="proposal-layout">
        <div>
          <div className="section">
            <span className="eyebrow">PERSONAL DETAILS</span><h2>Tell us about the policyholder</h2>
            <div className="form-grid">
              <input placeholder="Full Name" value={form.customerName} onChange={(e) => update("customerName", e.target.value)} />
              <input placeholder="Verified Email" value={form.customerEmail} readOnly aria-readonly="true" />
              <input placeholder="Mobile Number" inputMode="tel" value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} />
              <input type="date" max={new Date().toISOString().split("T")[0]} aria-label="Date of Birth" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
              <input className="proposal-full" placeholder="Residential Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>

          <div className="section">
            <span className="eyebrow">KYC & NOMINEE</span><h2>Identity and nominee details</h2>
            <div className="form-grid">
              <input placeholder="PAN Number" maxLength={10} value={form.panNumber} onChange={(e) => update("panNumber", e.target.value.toUpperCase())} />
              <input placeholder="Nominee Full Name" value={form.nomineeName} onChange={(e) => update("nomineeName", e.target.value)} />
              <select value={form.nomineeRelation} onChange={(e) => update("nomineeRelation", e.target.value)}>
                <option value="">Nominee Relationship</option><option>Spouse</option><option>Father</option><option>Mother</option><option>Son</option><option>Daughter</option><option>Other</option>
              </select>
              <input type="date" max={new Date().toISOString().split("T")[0]} aria-label="Nominee Date of Birth" value={form.nomineeDateOfBirth} onChange={(e) => update("nomineeDateOfBirth", e.target.value)} />
            </div>
            <label className="proposal-consent"><input type="checkbox" checked={form.proposalConsent} onChange={(e) => update("proposalConsent", e.target.checked)} /><span>I confirm these details are correct and consent to KYC and proposal processing.</span></label>
          </div>
        </div>

        <aside className="proposal-summary">
          <span className="eyebrow">PLAN SUMMARY</span><h2>{plan.planName}</h2><p>{plan.category}</p>
          <div><span>Life / Benefit Cover</span><strong>₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</strong></div>
          <div><span>Annual Premium</span><strong>₹{premium.toLocaleString("en-IN")}</strong></div>
          <div><span>Payment Years</span><strong>{plan.paymentYears || 1}</strong></div>
          <small>{benefits}</small>
          <button className="btn small-btn" onClick={continueToPayment}>Review & continue to payment →</button>
          <button className="mini-btn" onClick={() => navigate("/insurance-plans")}>Change plan</button>
        </aside>
      </div>
    </MainLayout>
  );
}
