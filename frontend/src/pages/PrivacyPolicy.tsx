import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="public-home">
      <header className="public-nav">
        <Link to="/" className="public-brand"><img src="/securelife-logo.jpg" alt="SecureLife Insurance" className="brand-logo-img" /> SecureLife</Link>
        <nav><Link to="/">Home</Link><Link to="/login">Sign in</Link></nav>
      </header>
      <main>
        <section className="public-services" style={{ maxWidth: 980, margin: "0 auto" }}>
          <div>
            <span className="eyebrow">LEGAL & PRIVACY</span>
            <h1>Privacy Policy</h1>
            <p>Last updated: 3 October 2026</p>
          </div>
          <article className="public-cover-card" style={{ marginTop: 24 }}>
            <h2>SecureLife Privacy Policy</h2>
            <p>SecureLife provides a digital insurance customer portal for exploring insurance plans, estimating premiums, purchasing and managing policies, submitting KYC documents, making payments, and accessing policy-related services.</p>
            <h3>Information we collect</h3>
            <p>Depending on the service you use, we may collect information you provide such as your name, contact details, date of birth, address, policy and nominee information, advisor details, KYC information and documents, uploaded vehicle or policy documents, payment-related transaction information, claims information, and account credentials or OTP verification information.</p>
            <h3>How we use information</h3>
            <p>We use information to create and secure accounts, provide insurance-related features, calculate or display premiums, process policy requests and payments, support KYC and claims workflows, provide receipts and policy documents, send service notifications, prevent misuse, troubleshoot the service, and comply with applicable legal or regulatory requirements.</p>
            <h3>Payments</h3>
            <p>Payments may be processed using third-party payment service providers. SecureLife does not intend to store full card, UPI PIN, or banking authentication credentials. Payment providers may process information under their own privacy policies and security practices.</p>
            <h3>Sharing of information</h3>
            <p>Information may be shared with service providers that are necessary to operate the service, such as hosting, communications, document storage, payment processing, and insurance-related service providers. We may also disclose information when required by law or to protect users and the service.</p>
            <h3>Data security and retention</h3>
            <p>We use reasonable technical and organizational safeguards designed to protect information. Information is retained only for as long as reasonably necessary for the purposes described here, including service, legal, security, and record-keeping requirements.</p>
            <h3>Your choices</h3>
            <p>You may contact us to ask questions about your personal information or request correction or deletion where applicable, subject to legal, regulatory, fraud-prevention, and insurance record-retention requirements.</p>
            <h3>Children</h3>
            <p>SecureLife is not designed for children to independently purchase or manage insurance services. Where information about a minor is required for an insurance product, it should be provided by an authorized parent, guardian, or policyholder as applicable.</p>
            <h3>Changes to this policy</h3>
            <p>We may update this Privacy Policy as the service or applicable requirements change. The latest version will be published on this page with an updated date.</p>
            <h3>Contact</h3>
            <p>For privacy or support questions, contact: <a href="mailto:arriyotechnologies@gmail.com">arriyotechnologies@gmail.com</a></p>
          </article>
        </section>
      </main>
      <footer className="public-footer"><strong>SecureLife</strong><span>Digital insurance customer portal</span><Link to="/">Home</Link></footer>
    </div>
  );
}
