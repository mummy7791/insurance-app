import { useState } from "react";
import "../styles/LombardHome.css";

type User = {
  name?: string;
  email?: string;
  role?: string;
};

const menus = {
  "Motor Insurance": [
    ["🚗", "Car Insurance", "Custom cover for your car"],
    ["🛵", "Bike Insurance", "Custom cover for your two-wheeler"],
    ["🚙", "Motor Insurance", "Reliable protection for your vehicle"],
    ["📄", "Motor Floater", "Secure multiple vehicles under one policy"],
  ],
  "Health Insurance": [
    ["💙", "Health Insurance", "Explore our top health policies"],
    ["⭐", "Elevate", "Comprehensive health plan that covers it all"],
    ["➕", "Activate Booster", "Boost your coverage with super top-up"],
    ["🛡️", "Family Shield", "Health cover for your family"],
  ],
  "Travel Insurance": [
    ["✈️", "Travel Insurance", "Secure your trips worldwide"],
    ["🌍", "International Travel", "Coverage for foreign travel"],
    ["🎒", "Student Travel", "Insurance for students abroad"],
  ],
  "SME Insurance": [
    ["🏪", "Shop Insurance", "Protect your business"],
    ["🏭", "Factory Insurance", "Cover for small industries"],
    ["📦", "Marine Insurance", "Goods transit protection"],
  ],
  "Corporate Insurance": [
    ["🏢", "Group Health", "Employee health protection"],
    ["🚚", "Fleet Insurance", "Cover multiple vehicles"],
    ["🧑‍💼", "Liability Insurance", "Business risk protection"],
  ],
  "Other Insurance": [
    ["🏠", "Home Insurance", "Protect your home"],
    ["🌾", "Crop Insurance", "Support for farmers"],
    ["💻", "Cyber Insurance", "Protection from cyber risk"],
  ],
  Renewals: [
    ["🔁", "Renew Policy", "Renew existing policy online"],
    ["📋", "Retrieve Quote", "Continue your previous quote"],
  ],
  Claims: [
    ["🧾", "File Claim", "Raise a claim request"],
    ["🔍", "Track Claim", "Check claim status"],
    ["☎️", "Claim Support", "Get claim assistance"],
  ],
};

const footerData = {
  Products: [
    "Motor Insurance",
    "Car Insurance",
    "Two Wheeler Insurance",
    "Health Insurance",
    "Travel Insurance",
    "NRI Insurance Services",
    "Business Insurance",
    "Crop Insurance",
    "Cyber Insurance",
    "ICICI Bharat Griha Raksha Policy",
  ],
  Services: [
    "Customer Support",
    "Citizen Charter",
    "Retrieve Quote",
    "Unclaimed Amount",
    "Intimate PA claim",
    "Renew Your Policy",
    "Portability",
    "EIA",
    "Online Dispute Resolution Portal for Investors",
    "SME Endorsements",
  ],
  Legal: [
    "Privacy Policy",
    "Insure App Privacy Policy",
    "Product Withdrawal",
    "Do Not Call Registry",
    "General Terms & Conditions",
    "Disclaimer",
    "Insurance Ombudsman",
    "Stewardship Policy",
    "Disclosure under Stewardship Policy",
    "Policy for Policyholder’s Interest Protection & Grievance Redressal",
    "Advisory to Customer and Channel Partners",
    "ICICI Lombard Product List",
    "GRO Details of Active Branches",
    "Motor Third Party claims - Statewise nodal officer details",
    "Whistle Blower Policy",
  ],
  "About Us": [
    "Overview",
    "Promoters",
    "CSR",
    "Risk Management",
    "Public Disclosures",
    "Awards and Recognitions",
    "Investor Relations",
    "Media",
  ],
  Others: [
    "Agents’ Portal",
    "Corporate Login",
    "Blacklisted Agents",
    "BAGI Blacklisted Agents",
    "Distribution Channels",
    "Pradhan Mantri Suraksha Bima Yojna",
    "Hospital Empanelment Criteria",
    "Account Aggregator",
    "International Business (IIO)",
    "Sitemap",
    "Become an Agent (SME)",
    "Data on Health Claim Service Indicators",
    "IRDAI List of Blacklisted Agents",
  ],
};

export default function CustomerDashboard() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [user] = useState<User>(() => {
    try {
      const savedUser = localStorage.getItem("insuranceUser");
      return savedUser ? JSON.parse(savedUser) : {};
    } catch {
      return {};
    }
  });

  const logout = () => {
    localStorage.removeItem("insuranceToken");
    localStorage.removeItem("insuranceUser");
    window.location.href = "/login";
  };

  return (
    <div className="icici-page">
      <div className="top-strip">
        <span>☎ 1800 2666 <b>(Available 24 x 7)</b></span>
        <span>📞 Call Back</span>
        <span>🟢 Live Chat</span>
        <span>Help⌄</span>
        <span>Info Centre⌄</span>
        <span>Investor Relations</span>
        <button>Become an advisor⌄</button>
        <button onClick={logout}>Login ❯</button>
      </div>

      <header className="main-nav">
        <div className="brand">
          <img src="/ic_launcher.png" alt="ICICI LIFE" />
          <div>
            <h2>ICICI LIFE</h2>
            <p>Insurance</p>
          </div>
        </div>

        <nav>
          {Object.keys(menus).map((menu) => (
            <div
              className="nav-item"
              key={menu}
              onMouseEnter={() => setActiveMenu(menu)}
            >
              {menu}⌄
            </div>
          ))}
        </nav>
      </header>

      {activeMenu && (
        <div
          className="mega-menu"
          onMouseEnter={() => setActiveMenu(activeMenu)}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div className="mega-left">
            {menus[activeMenu as keyof typeof menus].map(([icon, title, desc]) => (
              <div className="mega-row" key={title}>
                <span>{icon}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mega-right">
            <h3>Other Products</h3>
            <p>› NRI health insurance <b>25% off</b></p>
            <p>› Personal Protect</p>
            <p>› Max Protect</p>
            <p>› Family Shield</p>
            <p>› Golden Shield</p>
            <p>› Saral Suraksha Bima</p>
          </div>
        </div>
      )}

      <div className="ticker">
        Introducing Service Assure — 30-min roadside assistance promise. Now live with ICICI LIFE insurance.
      </div>

      <section className="hero">
        <div>
          <p className="tag">Service Assure</p>
          <h1>Car troubles? Not on our watch</h1>
          <p>Our insurance now comes with fast support, easy policies and smooth claims.</p>
        </div>

        <div className="hero-card">
          <h3>{user.name || "Customer"}</h3>
          <p>{user.role || "customer"}</p>
          <small>{user.email}</small>
        </div>
      </section>

      <section className="quote-box">
        <div className="product-tabs">
          {["🚗 Car", "🛵 Bike", "❤️ Health", "✈️ Travel", "🏠 Home", "🏢 SME", "🏬 Corporate", "🔁 Renewal"].map(
            (item) => (
              <div className="product-tab" key={item}>
                <span>{item.split(" ")[0]}</span>
                <p>{item.replace(item.split(" ")[0], "")}</p>
              </div>
            )
          )}
        </div>

        <div className="quote-form">
          <label>Car registration no.*<input placeholder="E.g. MH01DF5698" /></label>
          <label>Mobile number*<input placeholder="Enter mobile no." /></label>
          <label>Email*<input placeholder="Enter email address" /></label>
          <button>Get quote</button>
        </div>

        <a className="recent-link">Recent Quote</a>
      </section>

      <section className="stats">
        <div><h2>37.57 Million</h2><p>Policies issued</p></div>
        <div><h2>3.2 Million</h2><p>Claims processed</p></div>
        <div><h2>15200+</h2><p>Network garages</p></div>
        <div><h2>11000+</h2><p>Network hospitals</p></div>
      </section>

      <section className="products">
        <h2>Our products</h2>
        <div className="product-grid">
          {["Car", "Bike", "Health", "Travel"].map((p) => (
            <div className="product-card" key={p}>
              <h3>{p}</h3>
              <p>Cashless support, easy claim process and instant online policy.</p>
              <button>Explore</button>
            </div>
          ))}
        </div>
      </section>

      <footer className="big-footer">
        {Object.entries(footerData).map(([title, items]) => (
          <div key={title}>
            <h3>{title}</h3>
            {items.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        ))}
      </footer>
    </div>
  );
}