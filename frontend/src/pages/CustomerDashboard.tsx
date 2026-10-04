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

type PurchasedPlan = { _id:string; planName:string; policyNumber?:string; coverageAmount:number; yearlyPremium:number; policyStatus:string; paymentStatus?:string; receiptNumber?:string; startDate?:string; endDate?:string; };

type Premium = {
  _id: string;
  policyNumber: string;
  amount: number;
  dueDate: string;
  status: "Upcoming" | "Due" | "Grace Period" | "Overdue" | "Lapsed" | "Paid";
};

type DocumentItem = { _id: string; status: "Pending" | "Verified" | "Rejected"; documentType: string; };

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
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
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
        const [policyRes, premiumRes, claimRes, purchaseRes, documentRes] = await Promise.allSettled([
          api.get<Policy[]>("/policies"),
          api.get<Premium[]>("/premiums"),
          api.get<Claim[]>("/claims"),
          api.get<PurchasedPlan[]>("/plan-purchases/my-plans"),
          api.get<DocumentItem[]>("/documents"),
        ]);

        if (!active) return;
        if (policyRes.status === "fulfilled") setPolicies(Array.isArray(policyRes.value.data) ? policyRes.value.data : []);
        if (premiumRes.status === "fulfilled") setPremiums(Array.isArray(premiumRes.value.data) ? premiumRes.value.data : []);
        if (claimRes.status === "fulfilled") setClaims(Array.isArray(claimRes.value.data) ? claimRes.value.data : []);
        if (purchaseRes.status === "fulfilled") setPurchasedPlans(Array.isArray(purchaseRes.value.data) ? purchaseRes.value.data : []);
        if (documentRes.status === "fulfilled") setDocuments(Array.isArray(documentRes.value.data) ? documentRes.value.data : []);
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
  const purchasedPolicyNumbers = new Set(activePurchased.map((p) => p.policyNumber).filter(Boolean));
  const allPurchasedPolicyNumbers = new Set(purchasedPlans.map((p) => p.policyNumber).filter(Boolean));
  const standaloneActivePolicies = activePolicies.filter((p) => !p.policyNumber || !purchasedPolicyNumbers.has(p.policyNumber));
  const activePolicyCount = standaloneActivePolicies.length + activePurchased.length;
  const totalPolicyCount = policies.filter((p) => !p.policyNumber || !allPurchasedPolicyNumbers.has(p.policyNumber)).length + purchasedPlans.length;
  const totalCoverage = standaloneActivePolicies.reduce((sum, p) => sum + Number(p.sumAssured || 0), 0) + activePurchased.reduce((sum, p) => sum + Number(p.coverageAmount || 0), 0);
  const duePremiums = premiums.filter((p) => ["Upcoming","Due","Grace Period","Overdue"].includes(p.status));
  const dueAmount = duePremiums.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const openClaims = claims.filter((c) => !["Settled", "Rejected"].includes(c.status));
  const nextDue = [...duePremiums].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const verifiedDocuments = documents.filter((d) => d.status === "Verified").length;
  const kycProgress = documents.length === 0 ? 0 : Math.round((verifiedDocuments / documents.length) * 100);
  const recentClaim = claims[0];
  const primaryPlan = activePurchased[0];
  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  const renewalBuckets = {
    overdue: duePremiums.filter((p) => daysUntil(p.dueDate) < 0),
    seven: duePremiums.filter((p) => daysUntil(p.dueDate) >= 0 && daysUntil(p.dueDate) <= 7),
    fifteen: duePremiums.filter((p) => daysUntil(p.dueDate) > 7 && daysUntil(p.dueDate) <= 15),
    thirty: duePremiums.filter((p) => daysUntil(p.dueDate) > 15 && daysUntil(p.dueDate) <= 30),
  };
  const lifecycle = [
    { label: "Proposal Submitted", done: Boolean(primaryPlan) },
    { label: "Payment", done: primaryPlan?.paymentStatus === "Paid" },
    { label: "KYC Verification", done: kycProgress === 100 },
    { label: "Underwriting", done: Boolean(primaryPlan?.policyNumber) },
    { label: "Policy Issued", done: primaryPlan?.policyStatus === "Active" },
    { label: "Active", done: primaryPlan?.policyStatus === "Active" },
  ];

  return (
    <MainLayout
      title={`Welcome, ${user.name || "Policyholder"}`}
      subtitle="Your protection, payments and claims in one secure place"
    >
      <section className="securelife-showcase-hero">
        <img
          className="securelife-showcase-image"
          src="/India%E2%80%99s%20SecureLife%20Insurance%20Banner.png"
          alt="SecureLife Insurance - Your Protection, Our Responsibility"
        />
      </section>

      <section className="securelife-plan-browser">
        <div className="securelife-plan-search">
          <span aria-hidden="true">⌕</span>
          <span>Search plans (e.g. Car, Bike, Health, Term, etc.)....</span>
          <Link to="/insurance-plans">Search</Link>
        </div>
        <div className="securelife-category-strip">
          <Link to="/insurance-plans">🚗 <span>Car</span></Link>
          <Link to="/insurance-plans">🏍 <span>Bike</span></Link>
          <Link to="/insurance-plans">🛡 <span>Health</span></Link>
          <Link to="/insurance-plans">✈ <span>Travel</span></Link>
          <Link to="/insurance-plans">♥ <span>Term Life</span></Link>
          <Link to="/insurance-plans">👤 <span>Child</span></Link>
          <Link to="/insurance-plans">▣ <span>Pension</span></Link>
          <Link to="/insurance-plans">▦ <span>All Plans</span></Link>
        </div>
      </section>

      <section className="securelife-home-plans">
        <div className="reference-section-heading">
          <div><h2>Popular Insurance Plans</h2><p>Choose from our wide range of plans designed for your protection.</p></div>
          <Link to="/insurance-plans">View All Plans →</Link>
        </div>
        <div className="reference-plan-grid">
          <article className="reference-plan-card"><span>MOTOR INSURANCE</span><h3>Car Insurance</h3><div className="plan-visual plan-car"><img src="https://pngimg.com/uploads/toyota/toyota_PNG1937.png" alt="Car insurance" /></div><p>🛡 Cover: ₹5,00,000</p><p>₹ Premium from: ₹6,500</p><p>▣ Payment Years: 1</p><p>✓ Comprehensive Cover</p><Link to="/insurance-plans">View Plan →</Link></article>
          <article className="reference-plan-card"><span>MOTOR INSURANCE</span><h3>Bike Insurance</h3><div className="plan-visual plan-bike"><img src="https://pngimg.com/uploads/motorcycle/motorcycle_PNG5342.png" alt="Bike insurance" /></div><p>🛡 Cover: ₹1,00,000</p><p>₹ Premium from: ₹2,200</p><p>▣ Payment Years: 1</p><p>✓ Comprehensive Cover</p><Link to="/insurance-plans">View Plan →</Link></article>
          <article className="reference-plan-card health"><span>HEALTH INSURANCE</span><h3>Super Star PI</h3><div className="plan-visual plan-health"><span className="family-art">👨‍👩‍👧</span></div><p>🛡 Cover: ₹5,00,000</p><p>₹ Premium from: ₹10,000</p><p>▣ Payment Years: 1</p><p>✓ Cashless Hospital Network</p><Link to="/insurance-plans">View Plan →</Link></article>
          <article className="reference-plan-card life"><span>LIFE INSURANCE</span><h3>Term Life Insurance</h3><div className="plan-visual plan-life"><span className="family-art">☂️</span></div><p>🛡 Cover: ₹25,00,000</p><p>₹ Premium from: ₹350/month</p><p>▣ Payment Years: 10</p><p>✓ High Life Cover</p><Link to="/insurance-plans">View Plan →</Link></article>
        </div>
      </section>

      <section className="securelife-why">
        <div className="reference-section-heading"><div><h2>Why Choose SecureLife?</h2><p>Government-backed vision with modern digital convenience.</p></div></div>
        <div className="securelife-trust-grid">
          <div><b>🛡</b><span><strong>Trusted Protection</strong><small>Reliable and secure insurance solutions</small></span></div>
          <div><b>👥</b><span><strong>Wide Coverage</strong><small>Plans for individuals, families and businesses</small></span></div>
          <div><b>🇮🇳</b><span><strong>Government Support</strong><small>Aligned with national insurance initiatives</small></span></div>
          <div><b>🎧</b><span><strong>24x7 Support</strong><small>Always here to assist you</small></span></div>
        </div>
      </section>

      {loading ? <div className="section"><p>Loading your insurance summary...</p></div> : (
        <>
          <div className="customer-section-title"><div><span className="eyebrow">AT A GLANCE</span><h2>Your insurance summary</h2></div><span className="secure-chip">● Secure session</span></div>
          <div className="customer-summary-grid">
            <div className="customer-summary-card">
              <span>Active Policies</span>
              <strong>{activePolicyCount}</strong>
              <small>{totalPolicyCount} total policies</small>
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
              <small>{recentClaim ? `Latest: ${recentClaim.status}` : "No claim submitted"}</small>
            </div>
          </div>

          <div className="customer-health-grid">
            <Link to="/documents" className="customer-health-card">
              <div><span className="eyebrow">KYC READINESS</span><h3>{documents.length === 0 ? "Start verification" : `${kycProgress}% verified`}</h3><p>{verifiedDocuments} of {documents.length} uploaded documents verified</p></div>
              <div className="kyc-ring" style={{"--progress": `${kycProgress * 3.6}deg`} as React.CSSProperties}><span>{kycProgress}%</span></div>
            </Link>
            <Link to="/premiums" className="customer-health-card">
              <div><span className="eyebrow">NEXT PREMIUM</span><h3>{nextDue ? money(nextDue.amount) : "Nothing due"}</h3><p>{nextDue ? `Due on ${nextDue.dueDate}` : "Your current payments are up to date"}</p></div>
              <span className={nextDue?.status === "Overdue" ? "status-pill overdue" : "status-pill active"}>{nextDue?.status || "Up to date"}</span>
            </Link>
            <Link to="/claims" className="customer-health-card">
              <div><span className="eyebrow">CLAIM TRACKER</span><h3>{recentClaim?.status || "No active claim"}</h3><p>{recentClaim ? `${recentClaim.claimType} • ${money(recentClaim.claimAmount)}` : "Submit and track claims digitally"}</p></div>
              <span className="health-arrow">→</span>
            </Link>
          </div>

          {primaryPlan && <section className="section featured-cover">
            <div><span className="eyebrow">PRIMARY PROTECTION</span><h2>{primaryPlan.planName}</h2><p>{primaryPlan.policyNumber || "Policy number processing"}</p></div>
            <div className="featured-cover-metrics"><div><span>Protection</span><strong>{money(primaryPlan.coverageAmount)}</strong></div><div><span>Annual premium</span><strong>{money(primaryPlan.yearlyPremium)}</strong></div><div><span>Policy status</span><strong>{primaryPlan.policyStatus}</strong></div></div>
            <Link className="mini-btn" to="/policies">Open digital policy →</Link>
          </section>}

          <section className="section customer-action-center">
            <div className="section-heading-row"><div><span className="eyebrow">QUICK ACTIONS</span><h2>Everything you need, one tap away</h2><p className="section-copy">Policy documents, renewals, claims and servicing from one secure workspace.</p></div><span className="secure-chip">● Secure services</span></div>
            <div className="customer-action-grid">
              <Link to="/policies"><b>↓</b><span>Download Policy</span><small>Policy bond & receipt</small></Link>
              <Link to="/premiums"><b>₹</b><span>Pay Premium</span><small>Secure online payment</small></Link>
              <Link to="/claims"><b>✓</b><span>Raise Claim</span><small>Submit & track claim</small></Link>
              <Link to="/documents"><b>▤</b><span>Upload KYC</span><small>Private document vault</small></Link>
              <Link to="/policy-services"><b>↻</b><span>Policy Services</span><small>Nominee & service requests</small></Link>
              <Link to="/premiums"><b>◷</b><span>Renewal</span><small>Due dates & payment history</small></Link>
            </div>
          </section>

          <div className="customer-feature-grid">
            <section className="section renewal-center">
              <div className="section-heading-row"><div><span className="eyebrow">RENEWAL CENTER</span><h2>Never miss a premium</h2></div><Link to="/premiums">Payment history →</Link></div>
              <div className="renewal-bucket-grid">
                <Link to="/premiums" className="renewal-bucket urgent"><span>Overdue</span><strong>{renewalBuckets.overdue.length}</strong><small>Pay immediately</small></Link>
                <Link to="/premiums" className="renewal-bucket"><span>Due in 7 days</span><strong>{renewalBuckets.seven.length}</strong><small>Upcoming</small></Link>
                <Link to="/premiums" className="renewal-bucket"><span>Due in 15 days</span><strong>{renewalBuckets.fifteen.length}</strong><small>Plan ahead</small></Link>
                <Link to="/premiums" className="renewal-bucket"><span>Due in 30 days</span><strong>{renewalBuckets.thirty.length}</strong><small>Future due</small></Link>
              </div>
              {nextDue && <div className="next-renewal-row"><div><small>NEXT PAYMENT</small><strong>{nextDue.policyNumber}</strong><span>{nextDue.dueDate}</span></div><b>{money(nextDue.amount)}</b><Link to="/premiums">Renew Now →</Link></div>}
            </section>

            <section className="section policy-lifecycle-card">
              <div className="section-heading-row"><div><span className="eyebrow">POLICY TRACKER</span><h2>Policy journey</h2></div><Link to="/policies">View details →</Link></div>
              {!primaryPlan ? <div className="empty-state"><h3>No online policy yet</h3><p>Purchase a plan to start your digital policy journey.</p></div> :
              <><div className="lifecycle-policy"><strong>{primaryPlan.planName}</strong><small>{primaryPlan.policyNumber || "Policy number processing"}</small></div>
              <div className="policy-lifecycle">{lifecycle.map((stage, index) => <div className={stage.done ? "done" : ""} key={stage.label}><i>{stage.done ? "✓" : index + 1}</i><span>{stage.label}</span></div>)}</div></>}
            </section>
          </div>

          <div className="customer-dashboard-grid">
            <section className="section">
              <div className="section-heading-row">
                <div><span className="eyebrow">YOUR COVER</span><h2>My Policies</h2></div>
                <Link to="/policies">View all</Link>
              </div>
              {standaloneActivePolicies.length === 0 && activePurchased.length === 0 ? (
                <div className="empty-state"><h3>No active policy yet</h3><p>Explore available protection plans and choose one that suits your needs.</p><Link to="/insurance-plans">Browse plans</Link></div>
              ) : <>
                {standaloneActivePolicies.slice(0, 3).map((policy) => (
                <div className="policy-row" key={policy._id}>
                  <div><strong>{policy.policyName}</strong><small>{policy.policyNumber}</small></div>
                  <div><span>Cover</span><strong>{money(policy.sumAssured)}</strong></div>
                  <div><span>Premium</span><strong>{money(policy.premiumAmount)}</strong></div>
                  <span className="status-pill active">Active</span>
                </div>
              ))}
                {standaloneActivePolicies.length === 0 && activePurchased.slice(0, 3).map((policy) => (
                  <div className="policy-row" key={policy._id}>
                    <div><strong>{policy.planName}</strong><small>{policy.policyNumber || "Policy processing"}</small></div>
                    <div><span>Cover</span><strong>{money(policy.coverageAmount)}</strong></div>
                    <div><span>Premium</span><strong>{money(policy.yearlyPremium)}</strong></div>
                    <span className="status-pill active">{policy.policyStatus}</span>
                  </div>
                ))}
              </>}
            </section>

            <section className="section">
              <span className="eyebrow">QUICK SERVICES</span>
              <h2>What would you like to do?</h2>
              <div className="quick-service-grid">
                <Link to="/insurance-plans"><b>◇</b><span>Buy a Policy</span></Link>
                <Link to="/premiums"><b>₹</b><span>Pay Premium</span></Link>
                <Link to="/claims"><b>◎</b><span>File / Track Claim</span></Link>
                <Link to="/documents"><b>▤</b><span>Documents & KYC</span></Link>
                <Link to="/policy-services"><b>↻</b><span>Policy Services</span></Link>
                <Link to="/customer-profile"><b>◉</b><span>Update Profile</span></Link>
                <Link to="/notifications"><b>○</b><span>Notifications</span></Link>
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
