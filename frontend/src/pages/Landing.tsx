import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="public-home">
      <header className="public-nav">
        <Link to="/" className="public-brand"><img src="/securelife-logo.jpg" alt="SecureLife Insurance" className="brand-logo-img" /> SecureLife</Link>
        <nav>
          <Link to="/premium-calculator">Premium Calculator</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/register" className="public-nav-cta">Get started</Link>
        </nav>
      </header>

      <main>
        <section className="public-hero">
          <div className="public-hero-copy">
            <span className="eyebrow">INSURANCE, MADE CLEAR</span>
            <h1>Protect your future with a simpler insurance experience.</h1>
            <p>Explore protection options, estimate premiums, manage policies, payments, claims and KYC from one secure customer account.</p>
            <div className="public-hero-actions">
              <Link to="/register" className="customer-primary-action">Create free account →</Link>
              <Link to="/login" className="public-secondary-action">I already have an account</Link>
            </div>
            <div className="public-trust-row">
              <span>✓ Secure sign-in</span><span>✓ OTP verification</span><span>✓ Digital policy access</span>
            </div>
          </div>
          <div className="public-cover-card">
            <span className="eyebrow">YOUR PROTECTION HUB</span>
            <h2>Everything important, in one place.</h2>
            <div className="public-feature"><b>01</b><div><strong>Choose your cover</strong><small>Compare benefits, premiums and eligibility.</small></div></div>
            <div className="public-feature"><b>02</b><div><strong>Pay securely</strong><small>Complete your policy purchase through secure checkout.</small></div></div>
            <div className="public-feature"><b>03</b><div><strong>Stay in control</strong><small>Access policies, receipts, claims and KYC updates.</small></div></div>
          </div>
        </section>

        <section className="public-services">
          <div><span className="eyebrow">ONE ACCOUNT</span><h2>Your insurance journey, connected.</h2></div>
          <div className="public-service-grid">
            <article><span>01</span><h3>Compare plans</h3><p>Review available coverage and premium information before you proceed.</p></article>
            <article><span>02</span><h3>Manage policies</h3><p>Keep your active cover and policy information together in your dashboard.</p></article>
            <article><span>03</span><h3>Track service</h3><p>Follow premium history, claims, notifications and KYC from one place.</p></article>
          </div>
        </section>

        <section className="public-cta">
          <div><span className="eyebrow">PLAN AHEAD</span><h2>Start with a premium estimate.</h2><p>Use the calculator before creating your customer account.</p></div>
          <Link to="/premium-calculator" className="customer-primary-action">Calculate premium →</Link>
        </section>
      </main>
      <footer className="public-footer"><strong>SecureLife</strong><span>Digital insurance customer portal</span><Link to="/admin-login">Staff login</Link></footer>
    </div>
  );
}
