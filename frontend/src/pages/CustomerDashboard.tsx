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
  const [heroSlide, setHeroSlide] = useState(0);

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
  const heroSlides = [
    { kicker:"SECURELIFE POLICYHOLDER PORTAL", title:"Protection that stays", accent:"one step ahead.", copy:"Manage cover, renew premiums, track claims and keep your policy documents ready from one secure workspace.", cta:"Explore protection", to:"/insurance-plans", art:"family" },
    { kicker:"PROTECTION FOR EVERY JOURNEY", title:"Drive with confidence.", accent:"We cover the road.", copy:"Explore car and bike protection with simple digital purchase, policy access and renewal support.", cta:"Explore motor plans", to:"/insurance-plans", art:"motor" },
    { kicker:"HEALTH & LIFE PROTECTION", title:"Protect what matters", accent:"today and tomorrow.", copy:"Bring health and life protection together with easy servicing, premium tracking and secure documents.", cta:"View protection plans", to:"/insurance-plans", art:"health" }
  ];
  const currentHero = heroSlides[heroSlide];

  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide((slide) => (slide + 1) % heroSlides.length), 4800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <MainLayout
      title={`Welcome, ${user.name || "Policyholder"}`}
      subtitle="Your protection, payments and claims in one secure place"
    >
      <section className="sl-home-strip">
        <div className="sl-home-strip-track">
          <span>SecureLife Insurance</span><b>Plans</b><b>Life Insurance</b><b>Health Insurance</b><b>Car Insurance</b><b>Bike Insurance</b><b>Claims</b><b>Customer Services</b><b>Pay Premium</b>
        </div>
      </section>

      <section className={`securelife-reference-hero product-dashboard-hero sl-hero-slide sl-hero-${currentHero.art}`}>
        <button className="sl-hero-arrow prev" onClick={() => setHeroSlide((heroSlide + heroSlides.length - 1) % heroSlides.length)} aria-label="Previous banner">‹</button>
        <div className="reference-hero-copy" key={heroSlide}>
          <span className="dashboard-kicker">{currentHero.kicker}</span>
          <h1>{currentHero.title}<br/><strong>{currentHero.accent}</strong></h1>
          <p>{currentHero.copy}</p>
          <div className="dashboard-hero-actions">
            <Link to={currentHero.to} className="dashboard-primary-action">{currentHero.cta} <span>→</span></Link>
            <Link to="/policies" className="dashboard-secondary-action">Know More</Link>
          </div>
        </div>
        <div className="dashboard-hero-insight">
          <span className="insight-label">YOUR PROTECTION</span><strong>{money(totalCoverage)}</strong>
          <small>Across {activePolicyCount} active {activePolicyCount === 1 ? "policy" : "policies"}</small><div className="insight-divider" />
          <div><span>Premium due</span><b>{money(dueAmount)}</b></div><div><span>Open claims</span><b>{openClaims.length}</b></div><div><span>KYC verified</span><b>{kycProgress}%</b></div>
        </div>
        <button className="sl-hero-arrow next" onClick={() => setHeroSlide((heroSlide + 1) % heroSlides.length)} aria-label="Next banner">›</button>
        <div className="sl-hero-dots">{heroSlides.map((_,i)=><button key={i} className={i===heroSlide?"active":""} onClick={()=>setHeroSlide(i)} aria-label={`Banner ${i+1}`}/>)}</div>
        <div className="sl-hero-servicebar">
          <Link to="/insurance-plans">ⓘ <span>Know More</span></Link>
          <Link to="/help">▣ <span>Talk To Experts</span></Link>
          <Link to="/policy-services">⌂ <span>Customer Services</span></Link>
        </div>
      </section>

      <section className="sl-goals-section">
        <div className="sl-section-head"><div><span>INSURANCE PLANS FOR ALL YOUR GOALS</span><h2>Protection for every stage of life</h2></div><Link to="/insurance-plans">View all plans →</Link></div>
        <div className="sl-goal-track">
          <Link to="/insurance-plans"><b>↗</b><strong>Life Insurance</strong><small>Protect your family's future</small></Link>
          <Link to="/insurance-plans"><b>☂</b><strong>Term Life Insurance</strong><small>High life cover</small></Link>
          <Link to="/insurance-plans"><b>✚</b><strong>Health Insurance</strong><small>Health protection</small></Link>
          <Link to="/insurance-plans"><b>🚗</b><strong>Car Insurance</strong><small>Drive protected</small></Link>
          <Link to="/insurance-plans"><b>🏍</b><strong>Bike Insurance</strong><small>Ride protected</small></Link>
          <Link to="/premiums"><b>₹</b><strong>Pay Premium</strong><small>Fast & secure</small></Link>
        </div>
      </section>

      <section className="sl-customer-corner">
        <div><span>EXISTING CUSTOMER CORNER</span><h2>Everything you need, right here</h2></div>
        <div className="sl-customer-corner-grid">
          <Link to="/premiums"><b>₹</b><strong>Pay Premium</strong><small>Quick online payment</small></Link>
          <Link to="/policies"><b>▣</b><strong>My Policies</strong><small>View policy details</small></Link>
          <Link to="/claims"><b>✓</b><strong>Claims</strong><small>File & track claims</small></Link>
          <Link to="/documents"><b>⌑</b><strong>KYC & Documents</strong><small>Manage documents</small></Link>
          <Link to="/policy-services"><b>↻</b><strong>Policy Services</strong><small>Manage your policy</small></Link>
        </div>
      </section>

      <section className="sl-benefits-section">
        <div className="sl-section-head"><div><span>WHY BUY ONLINE</span><h2>Choosing to buy online has benefits</h2></div></div>
        <div className="sl-benefit-grid"><article><b>₹</b><strong>Simple Premiums</strong><small>Clear premium information</small></article><article><b>⚡</b><strong>Hassle-Free Purchase</strong><small>Quick digital journey</small></article><article><b>🔒</b><strong>Secure Transactions</strong><small>Protected online experience</small></article><article><b>💬</b><strong>Reliable Assistance</strong><small>Support when you need it</small></article><article><b>🤝</b><strong>Policy Services</strong><small>Manage cover in one place</small></article></div>
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
