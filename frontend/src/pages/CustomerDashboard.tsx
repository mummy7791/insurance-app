import { useState } from "react";
import "../styles/LombardHome.css";

type User = {
  name?: string;
  email?: string;
  role?: string;
};

const navMenus = {
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

const productTabs = [
  ["🚗", "Car"],
  ["🛵", "Bike"],
  ["❤️", "Health"],
  ["✈️", "Travel"],
  ["🏠", "Home"],
  ["🏪", "SME"],
  ["🏢", "Corporate"],
  ["🔁", "Renewal"],
];

const productCards = [
  {
    title: "Car",
    points: [
      "Doorstep cashless repair & claims process",
      "Kms-based plans for low mileage drivers",
      "AI-backed instant claims process",
    ],
  },
  {
    title: "Bike",
    points: [
      "Cashless garage network",
      "Option of long-term policies",
      "Service guarantee on repairs",
    ],
  },
  {
    title: "Health",
    points: [
      "Personalised policies for all budgets & ages",
      "Cashless treatment at any hospital",
      "Coverage for mild sickness to hospitalisation",
    ],
  },
  {
    title: "Travel",
    points: [
      "Cashless hospitalisation worldwide",
      "Coverage for missed flights, baggage & passport loss",
      "Instant online policy",
    ],
  },
];

export default function CustomerDashboard() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Health");

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
          {Object.keys(navMenus).map((menu) => (
            <div
              key={menu}
              className="nav-item"
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
            {navMenus[activeMenu as keyof typeof navMenus].map(
              ([icon, title, desc]) => (
                <div className="mega-row" key={title}>
                  <span>{icon}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mega-right">
            <h3>Other Products</h3>
            <p>› NRI health insurance <b>25% off</b></p>
            <p>› Personal Protect</p>
            <p>› Max Protect</p>
            <p>› Health AdvantEdge</p>
            <p>› Family Shield</p>
            <p>› Golden Shield</p>
            <p>› Saral Suraksha Bima</p>
          </div>
        </div>
      )}

      <div className="ticker">
        Introducing Service Assure — 30-min roadside assistance promise. Now live with ICICI LIFE insurance. |
        Settlement of Insurance Disputes through Permanent Lok Adalats | Under the second 100-Day Campaign
        Saksham Niveshak - Shareholders are reminded to update their KYC details.
      </div>

      <section className="hero">
        <div className="hero-content">
          <p className="tag">Service Assure</p>
          <h1>Car troubles? Not on our watch</h1>
          <p>
            Our car insurance now comes with Service Assure – 30 min roadside
            assistance promise.
          </p>
        </div>

        <div className="hero-image-card">
          <div className="car-shape">🚘</div>
          <div>
            <h3>{user.name || "Customer"}</h3>
            <p>{user.role || "customer"}</p>
            <small>{user.email}</small>
          </div>
        </div>
      </section>

      <section className="quote-wrapper">
        <div className="product-tabs">
          {productTabs.map(([icon, title]) => (
            <button
              type="button"
              key={title}
              className={`product-tab ${activeTab === title ? "active" : ""}`}
              onClick={() => setActiveTab(title)}
            >
              <span>{icon}</span>
              <p>{title}</p>
            </button>
          ))}
        </div>

        {activeTab === "Health" ? (
          <div className="quote-form health-form">
            <label>
              <span>Select products</span>
              <select defaultValue="Elevate">
                <option>Elevate</option>
                <option>Health Insurance</option>
                <option>Activate Booster</option>
                <option>Family Shield</option>
              </select>
            </label>

            <label>
              <span>Insure members</span>
              <select defaultValue="">
                <option value="" disabled>Add member</option>
                <option>Self</option>
                <option>Self + Spouse</option>
                <option>Family</option>
              </select>
            </label>

            <label>
              <span>Contact details</span>
              <input placeholder="Add details" />
            </label>

            <button>Get quote</button>

            <div className="quote-links">
              <a>Port existing policy ›</a>
              <a>NRI health insurance at 25% off ›</a>
            </div>
          </div>
        ) : (
          <div className="quote-form">
            <label>
              <span>{activeTab} registration no.*</span>
              <input placeholder="E.g. MH01DF5698" />
            </label>

            <label>
              <span>Mobile number*</span>
              <input placeholder="Enter mobile no." />
            </label>

            <label>
              <span>Email*</span>
              <input placeholder="Enter email address" />
            </label>

            <button>Get quote</button>

            <div className="quote-links">
              <a>Recent Quote</a>
              <a>Discover product prices here</a>
            </div>
          </div>
        )}

        <div className="terms-row">
          <label>
            <input type="checkbox" /> I agree to the terms & conditions
          </label>
          <p>I want to get my quote and policy details on WhatsApp and Email.</p>
        </div>
      </section>

      <section className="stats">
        <div>
          <h2>37.57 Million</h2>
          <p>Policies issued</p>
          <small>FY 2024-25</small>
        </div>
        <div>
          <h2>3.2 Million</h2>
          <p>Claims processed</p>
          <small>FY 2024-25</small>
        </div>
        <div>
          <h2>15200+</h2>
          <p>Network garages</p>
          <small>As on 1st June 2026</small>
        </div>
        <div>
          <h2>11000+</h2>
          <p>Network hospitals</p>
          <small>As on 17th March 2026</small>
        </div>
      </section>

      <section className="promo-strip">
        {[
          "25-years-web",
          "ria-web",
          "msme-day-campaign",
          "ahmedabad-plane-crash",
          "rev-annexure",
          "base-product",
          "dont-fall",
          "cashless-everywhere",
          "cyber-security",
          "renewal",
          "serviceassure",
          "25years",
          "road-safety1",
          "road-safety2",
          "travel-report",
          "press-release",
        ].map((item) => (
          <div key={item}>{item}</div>
        ))}
      </section>

      <section className="why-section">
        <h2>Why choose ICICI LIFE?</h2>

        <div className="why-block">
          <div>
            <h3>Dependable</h3>
            <h4>You can rely on us at all times.</h4>
            <p>
              Be it during large calamities or minor accidents, we stand by our
              customers in time of need. In times of trouble, be assured, we’ve
              got your back.
            </p>
          </div>
          <div className="why-img">image-1</div>
        </div>

        <div className="why-block reverse">
          <div className="why-img">image-2</div>
          <div>
            <h3>Approachable</h3>
            <h4>You&apos;ve got a friend in us.</h4>
            <p>
              In your hour of need, you need more than claim support. Our team
              guides you through the right course of action during emergencies.
            </p>
            <p><b>We are available where you are.</b> Call centre | Chat | 340+ branches</p>
          </div>
        </div>

        <div className="why-block">
          <div>
            <h3>Transparent</h3>
            <h4>We give you the power of clarity.</h4>
            <p>
              From policy issuance to claims, you can count on us for keeping it
              simple and clear.
            </p>
          </div>
          <div className="why-img">image-3</div>
        </div>
      </section>

      <section className="products-section">
        <h2>Our products</h2>

        <div className="product-grid">
          {productCards.map((product) => (
            <div className="product-card" key={product.title}>
              <h3>{product.title}</h3>
              <ul>
                {product.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div>
                <button>Check price</button>
                <button className="outline-btn">Explore</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-section">
        <div>
          <h2>Experience insurance on the go with IL TakeCare app</h2>
          <p>
            Buy policies, renew them, file claims or complete mobile
            self-inspections — all from your phone.
          </p>
          <h3>Benefits Beyond Insurance</h3>
          <ul>
            <li>Health vitals via face scan</li>
            <li>Driving insights and pattern</li>
            <li>Fitness tracking and challenges</li>
          </ul>
          <button>Learn more</button>
        </div>

        <div className="phone-card">iphone</div>
      </section>

      <section className="info-section">
        <div>
          <h2>#LearnCPRSaveALife</h2>
          <p>
            Did you know? Effective CPR can double the chance of a person
            surviving a cardiac arrest.
          </p>
          <div className="video-box">youtube</div>
        </div>

        <div>
          <h2>PMFBY</h2>
          <p>
            The PMFBY was launched in 2016 and aims at adoption of technology
            for yield estimation and improving crop insurance penetration in
            India.
          </p>
        </div>
      </section>

      <section className="awards-section">
        <h2>A happy you, makes a happy us.</h2>
        <h3>Awards & recognition</h3>

        <div className="award-grid">
          <div>
            <h4>asia-award</h4>
            <p>
              Voted Domestic General Insurer of the Year - India at Insurance
              Asia Awards.
            </p>
          </div>

          <div>
            <h4>etbfsi-exceller</h4>
            <p>
              Received Best Integrated Marketing Campaign of the Year.
            </p>
          </div>
        </div>

        <a>More awards</a>
      </section>

      <section className="company-info">
        <h3>ICICI LIFE General Insurance Company Limited</h3>
        <p>
          ICICI LIFE House, 414, Veer Savarkar Marg, Near Siddhi Vinayak
          Temple, Prabhadevi, Mumbai - 400025.
        </p>
        <p>Reg. No.115</p>
        <p>Email-customersupport@icicilife.com</p>
        <p>Fax no - 022 61961323</p>
        <p>Contact - 1800 2666 (Available 24 x 7)</p>
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

      <section className="footer-note">
        <div className="quick-links">
          <span>Info Center</span>
          <span>Renewal</span>
          <span>Claim</span>
          <span>Help</span>
          <span>Customer Reviews</span>
          <span>Car Insurance</span>
          <span>Two Wheeler Insurance</span>
          <span>Health Insurance</span>
          <span>Travel Insurance</span>
          <span>SME Insurance</span>
        </div>

        <p>
          ICICI LIFE General Insurance Company Ltd. is one of the leading
          private sector general insurance companies in India offering insurance
          coverage for motor, health, travel, home, student travel and more.
          Policies can be purchased and renewed online as well.
        </p>

        <p>
          Insurance is the subject matter of solicitation. Please read the sales
          brochure carefully before concluding a sale.
        </p>

        <h4>Group Companies</h4>
      </section>

      <div className="chat-bubble">ASK RIA<br />LIVE CHAT</div>
    </div>
  );
}