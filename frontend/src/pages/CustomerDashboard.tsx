import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type Policy = {
  _id: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  sumAssured: number;
  paymentMode: string;
  status: string;
};

type PurchasedPlan = { _id:string; planName:string; policyNumber?:string; coverageAmount:number; yearlyPremium:number; policyStatus:string; };

type Premium = {
  _id: string;
  policyNumber: string;
  amount: number;
  dueDate: string;
  status: "Due" | "Paid" | "Overdue";
};

type Claim = {
  _id: string;
  policyNumber: string;
  claimType: string;
  claimAmount: number;
  status: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function CustomerDashboard() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [premiums, setPremiums] = useState<Premium[]>([]);
  const [purchasedPlans, setPurchasedPlans] = useState<PurchasedPlan[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("insuranceUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const [policyRes, premiumRes, claimRes, purchaseRes] = await Promise.all([
          api.get<Policy[]>("/policies"),
          api.get<Premium[]>("/premiums"),
          api.get<Claim[]>("/claims"),
          api.get<PurchasedPlan[]>("/plan-purchases/my-plans"),
        ]);

        if (!active) return;
        setPolicies(policyRes.data);
        setPremiums(premiumRes.data);
        setClaims(claimRes.data);
        setPurchasedPlans(purchaseRes.data);
      } catch (error) {
        console.error("Customer dashboard load error:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDashboard();
    return () => { active = false; };
  }, []);

  const activePolicies = policies.filter((p) => p.status === "active");
  const activePurchased = purchasedPlans.filter((p) => p.policyStatus === "Active");
  const activePolicyCount = activePolicies.length + activePurchased.length;
  const totalCoverage = activePolicies.reduce((sum, p) => sum + Number(p.sumAssured || 0), 0) + activePurchased.reduce((sum, p) => sum + Number(p.coverageAmount || 0), 0);
  const duePremiums = premiums.filter((p) => p.status === "Due" || p.status === "Overdue");
  const dueAmount = duePremiums.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const openClaims = claims.filter((c) => !["Settled", "Rejected"].includes(c.status));
  const nextDue = [...duePremiums].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <MainLayout
      title={`Welcome, ${user.name || "Policyholder"}`}
      subtitle="Your protection, payments and claims in one secure place"
    >
      <div className="customer-welcome">
        <div>
          <span className="eyebrow">SECURELIFE CUSTOMER PORTAL</span>
          <h1>Insurance made simple.</h1>
          <p>View your cover, pay premiums, manage documents and track claims without switching between multiple screens.</p>
        </div>
        <Link className="customer-primary-action" to="/insurance-plans">Explore Plans →</Link>
      </div>

      {loading ? <div className="section"><p>Loading your insurance summary...</p></div> : (
        <>
          <div className="customer-summary-grid">
            <div className="customer-summary-card">
              <span>Active Policies</span>
              <strong>{activePolicyCount}</strong>
              <small>{policies.length + purchasedPlans.length} total policies</small>
            </div>
            <div className="customer-summary-card">
              <span>Total Protection</span>
              <strong>{money(totalCoverage)}</strong>
              <small>Across active policies</small>
            </div>
            <div className="customer-summary-card">
              <span>Premium Due</span>
              <strong>{money(dueAmount)}</strong>
              <small>{nextDue ? `Next due: ${nextDue.dueDate}` : "No payment due"}</small>
            </div>
            <div className="customer-summary-card">
              <span>Open Claims</span>
              <strong>{openClaims.length}</strong>
              <small>{claims.length} total claims</small>
            </div>
          </div>

          <div className="customer-dashboard-grid">
            <section className="section">
              <div className="section-heading-row">
                <div><span className="eyebrow">YOUR COVER</span><h2>My Policies</h2></div>
                <Link to="/policies">View all</Link>
              </div>
              {activePolicies.length === 0 ? (
                <div className="empty-state"><h3>No active policy yet</h3><p>Explore available protection plans and choose one that suits your needs.</p><Link to="/insurance-plans">Browse plans</Link></div>
              ) : activePolicies.slice(0, 3).map((policy) => (
                <div className="policy-row" key={policy._id}>
                  <div><strong>{policy.policyName}</strong><small>{policy.policyNumber}</small></div>
                  <div><span>Cover</span><strong>{money(policy.sumAssured)}</strong></div>
                  <div><span>Premium</span><strong>{money(policy.premiumAmount)}</strong></div>
                  <span className="status-pill active">Active</span>
                </div>
              ))}
            </section>

            <section className="section">
              <span className="eyebrow">QUICK SERVICES</span>
              <h2>What would you like to do?</h2>
              <div className="quick-service-grid">
                <Link to="/insurance-plans"><b>🛡️</b><span>Buy a Policy</span></Link>
                <Link to="/premiums"><b>💳</b><span>Pay Premium</span></Link>
                <Link to="/claims"><b>🧾</b><span>File / Track Claim</span></Link>
                <Link to="/documents"><b>📂</b><span>Documents & KYC</span></Link>
                <Link to="/customer-profile"><b>👤</b><span>Update Profile</span></Link>
                <Link to="/notifications"><b>🔔</b><span>Notifications</span></Link>
              </div>
            </section>
          </div>

          <section className="section">
            <div className="section-heading-row">
              <div><span className="eyebrow">PAYMENTS</span><h2>Upcoming Premiums</h2></div>
              <Link to="/premiums">Payment history</Link>
            </div>
            {duePremiums.length === 0 ? <p className="muted-copy">You have no premium payments due.</p> :
              duePremiums.slice(0, 4).map((premium) => (
                <div className="premium-row" key={premium._id}>
                  <span>{premium.policyNumber}</span>
                  <strong>{money(premium.amount)}</strong>
                  <span>Due {premium.dueDate}</span>
                  <span className={`status-pill ${premium.status === "Overdue" ? "overdue" : "due"}`}>{premium.status}</span>
                </div>
              ))}
          </section>
        </>
      )}
    </MainLayout>
  );
}
