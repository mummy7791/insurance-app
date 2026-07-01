import { useEffect, useState } from "react";
import "../styles/LombardHome.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://insurance-app-7vkn.onrender.com";


type User = {
  name?: string;
  email?: string;
  role?: string;
};

type ChatMessage = {
  from: "bot" | "user";
  text: string;
};

type ActivePanel = "profile" | "dashboard" | null;

type CustomerDetails = {
  photo: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  aadhaar: string;
  pan: string;
  nominee: string;
  nomineeRelation: string;
  advisor: string;
  agencyManager: string;
  branch: string;
  planName: string;
  policyNo: string;
  policyType: string;
  status: string;
  premium: string;
  coverage: string;
  startDate: string;
  expiryDate: string;
  renewalDate: string;
  members: string[];
  lastPayment: string;
  nextPremium: string;
  paymentMode: string;
  transactionId: string;
  claimsRaised: number;
  approvedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
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

const heroSlides = [
  {
    tag: "Service Assure",
    title: "Car troubles? Not on our watch",
    text: "Our car insurance now comes with Service Assure – 30 min roadside assistance promise.",
    icon: "🚘",
  },
  {
    tag: "Health Cover",
    title: "Cashless treatment made simple",
    text: "Get easy health insurance, network hospitals and quick claim support.",
    icon: "🏥",
  },
  {
    tag: "Travel Safe",
    title: "Travel worry-free worldwide",
    text: "Coverage for missed flights, baggage loss and medical emergencies.",
    icon: "✈️",
  },
];

const whySlides = [
  {
    title: "Dependable",
    sub: "You can rely on us at all times.",
    text: "Be it emergencies, claims or renewals, we stand with customers when they need support.",
    icon: "🛡️",
  },
  {
    title: "Approachable",
    sub: "You've got a friend in us.",
    text: "Our support team guides you through policies, payments, claims and renewals.",
    icon: "🤝",
  },
  {
    title: "Transparent",
    sub: "We give you the power of clarity.",
    text: "Simple policy details, clear premium information and easy claim tracking.",
    icon: "🔍",
  },
];

const productCards = [
  {
    title: "Car",
    icon: "🚗",
    points: [
      "Doorstep cashless repair & claims process",
      "Kms-based plans for low mileage drivers",
      "AI-backed instant claims process",
    ],
  },
  {
    title: "Bike",
    icon: "🛵",
    points: [
      "Cashless garage network",
      "Option of long-term policies",
      "Service guarantee on repairs",
    ],
  },
  {
    title: "Health",
    icon: "❤️",
    points: [
      "Personalised policies for all budgets & ages",
      "Cashless treatment at any hospital",
      "Coverage for mild sickness to hospitalisation",
    ],
  },
  {
    title: "Travel",
    icon: "✈️",
    points: [
      "Cashless hospitalisation worldwide",
      "Coverage for missed flights, baggage & passport loss",
      "Instant online policy",
    ],
  },
];

const getBotReply = (question: string) => {
  const q = question.toLowerCase();

  if (q.includes("claim")) {
    return "You can file or track your claim from the Claims section. Keep your policy number ready.";
  }

  if (q.includes("renew")) {
    return "You can renew your policy from Renewals using policy number or registered mobile number.";
  }

  if (q.includes("health")) {
    return "For health insurance, select Elevate, add members, enter contact details and click Get quote.";
  }

  if (q.includes("car") || q.includes("motor")) {
    return "For car insurance, enter registration number, mobile number and email to get a quote.";
  }

  return "I can help you with insurance quotes, renewals, claims, health insurance, car insurance and policy details.";
};

export default function CustomerDashboard() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Health");
  const [heroIndex, setHeroIndex] = useState(0);
  const [whyIndex, setWhyIndex] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [apiCustomerDetails, setApiCustomerDetails] =
    useState<Partial<CustomerDetails> | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Hello 👋 I am RIA. How can I help you today?" },
  ]);

  const [user] = useState<User>(() => {
    try {
      const savedUser = localStorage.getItem("insuranceUser");
      return savedUser ? JSON.parse(savedUser) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
      setWhyIndex((prev) => (prev + 1) % whySlides.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
  const email = user.email;

  if (!email) return;

  const loadCustomer = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/customer/me/${encodeURIComponent(email)}`
      );

      if (!res.ok) {
        throw new Error("Customer not found");
      }

      const data: Partial<CustomerDetails> = await res.json();
      setApiCustomerDetails(data);
    } catch (err) {
      console.log("Customer API error:", err);
      setApiCustomerDetails(null);
    }
  };

  void loadCustomer();
}, [user.email]);

  const fallbackDetails: CustomerDetails = {
    photo: "👩",
    customerId: "CUST-1001",
    name: user.name || "Bhavani Jalla",
    email: user.email || "bhavani@gmail.com",
    phone: "Not added",
    dob: "Not added",
    gender: "Not added",
    address: "Not added",
    aadhaar: "XXXX-XXXX-XXXX",
    pan: "Not added",
    nominee: "Not added",
    nomineeRelation: "Not added",
    advisor: "Not assigned",
    agencyManager: "Not assigned",
    branch: "Not assigned",
    planName: "No Plan Assigned",
    policyNo: "Not issued",
    policyType: "Not assigned",
    status: "PENDING",
    premium: "₹0",
    coverage: "₹0",
    startDate: "Not started",
    expiryDate: "Not added",
    renewalDate: "Not added",
    members: [],
    lastPayment: "₹0",
    nextPremium: "₹0",
    paymentMode: "Not added",
    transactionId: "Not added",
    claimsRaised: 0,
    approvedClaims: 0,
    pendingClaims: 0,
    rejectedClaims: 0,
  };

  const customerDetails: CustomerDetails = {
    ...fallbackDetails,
    ...(apiCustomerDetails || {}),
    name: apiCustomerDetails?.name || fallbackDetails.name,
    email: apiCustomerDetails?.email || fallbackDetails.email,
    members: apiCustomerDetails?.members || fallbackDetails.members,
  };

  const logout = () => {
    localStorage.removeItem("insuranceToken");
    localStorage.removeItem("insuranceUser");
    window.location.href = "/login";
  };

  const openPanel = (panel: "profile" | "dashboard") => {
    setActivePanel(panel);
    setProfileOpen(false);
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { from: "user", text },
      { from: "bot", text: getBotReply(text) },
    ]);

    setChatInput("");
  };

  const slide = heroSlides[heroIndex];
  const why = whySlides[whyIndex];

  return (
    <div className="icici-page">
      <div className="top-strip">
        <span>☎ 1800 2666 <b>(Available 24 x 7)</b></span>
        <span>📞 Call Back</span>
        <span>🟢 Live Chat</span>
        <span>Help⌄</span>
        <span>Info Centre⌄</span>
        <span>Investor Relations</span>
        <button type="button">Become an advisor⌄</button>

        <div className="profile-box">
          <button
            type="button"
            className="profile-btn"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            {customerDetails.name} ⌄
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <p>{customerDetails.email}</p>
              <button type="button" onClick={() => openPanel("profile")}>
                Profile
              </button>
              <button type="button" onClick={() => openPanel("dashboard")}>
                Dashboard
              </button>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
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
        <div className="ticker-track">
          Introducing Service Assure — 30-min roadside assistance promise. Now live with ICICI LIFE insurance. |
          Settlement of Insurance Disputes through Permanent Lok Adalats | Saksham Niveshak - update your KYC details.
        </div>
      </div>

      <section className="hero-slider">
        <div className="hero-slide">
          <div className="hero-content">
            <p className="tag">{slide.tag}</p>
            <h1>{slide.title}</h1>
            <p>{slide.text}</p>
          </div>

          <div className="hero-visual">
            <span>{slide.icon}</span>
          </div>
        </div>

        <div className="slider-dots">
          {heroSlides.map((item, index) => (
            <button
              type="button"
              key={item.title}
              className={index === heroIndex ? "active" : ""}
              onClick={() => setHeroIndex(index)}
            />
          ))}
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

            <button type="button">Get quote</button>

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

            <button type="button">Get quote</button>

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
        <div><h2>37.57 Million</h2><p>Policies issued</p><small>FY 2024-25</small></div>
        <div><h2>3.2 Million</h2><p>Claims processed</p><small>FY 2024-25</small></div>
        <div><h2>15200+</h2><p>Network garages</p><small>As on 1st June 2026</small></div>
        <div><h2>11000+</h2><p>Network hospitals</p><small>As on 17th March 2026</small></div>
      </section>

      <section className="promo-strip">
        {[
          "25-years-web", "ria-web", "msme-day-campaign", "base-product",
          "cashless-everywhere", "cyber-security", "renewal", "serviceassure",
          "road-safety1", "road-safety2", "travel-report", "press-release",
        ].map((item) => (
          <div key={item}>{item}</div>
        ))}
      </section>

      <section className="why-section">
        <h2>Why choose ICICI LIFE?</h2>

        <div className="image-carousel-card">
          <div className="image-carousel-visual">
            <span>{why.icon}</span>
          </div>

          <div className="image-carousel-content">
            <h3>{why.title}</h3>
            <h4>{why.sub}</h4>
            <p>{why.text}</p>
          </div>

          <div className="image-carousel-dots">
            {whySlides.map((item, index) => (
              <button
                type="button"
                key={item.title}
                className={index === whyIndex ? "active" : ""}
                onClick={() => setWhyIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="products-section">
        <h2>Our products</h2>

        <div className="product-grid">
          {productCards.map((product) => (
            <div className="product-card" key={product.title}>
              <div className="product-icon">{product.icon}</div>
              <h3>{product.title}</h3>
              <ul>
                {product.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div className="product-actions">
                <button type="button">Check price</button>
                <button type="button" className="outline-btn">Explore</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-section">
        <div>
          <h2>Experience insurance on the go with IL TakeCare app</h2>
          <p>Buy policies, renew them, file claims or complete mobile self-inspections — all from your phone.</p>
          <h3>Benefits Beyond Insurance</h3>
          <ul>
            <li>Health vitals via face scan</li>
            <li>Driving insights and pattern</li>
            <li>Fitness tracking and challenges</li>
          </ul>
          <button type="button">Learn more</button>
        </div>

        <div className="phone-card">📱</div>
      </section>

      <section className="info-section">
        <div>
          <h2>#LearnCPRSaveALife</h2>
          <p>Effective CPR can double the chance of a person surviving a cardiac arrest.</p>
          <div className="video-box">▶ youtube</div>
        </div>

        <div>
          <h2>PMFBY</h2>
          <p>PMFBY aims at adoption of technology for yield estimation and improving crop insurance penetration in India.</p>
        </div>
      </section>

      <section className="awards-section">
        <h2>A happy you, makes a happy us.</h2>
        <h3>Awards & recognition</h3>

        <div className="award-grid">
          <div>
            <h4>asia-award</h4>
            <p>Voted Domestic General Insurer of the Year - India at Insurance Asia Awards.</p>
          </div>
          <div>
            <h4>etbfsi-exceller</h4>
            <p>Received Best Integrated Marketing Campaign of the Year.</p>
          </div>
        </div>

        <a>More awards</a>
      </section>

      <section className="company-info">
        <h3>ICICI LIFE General Insurance Company Limited</h3>
        <p>ICICI LIFE House, 414, Veer Savarkar Marg, Near Siddhi Vinayak Temple, Prabhadevi, Mumbai - 400025.</p>
        <p>Reg. No.115</p>
        <p>Email-customersupport@icicilife.com</p>
        <p>Fax no - 022 61961323</p>
        <p>Contact - 1800 2666 (Available 24 x 7)</p>
      </section>

      <footer className="big-footer">
        {Object.entries(footerData).map(([title, items]) => (
          <div key={title}>
            <h3>{title}</h3>
            {items.map((item) => <p key={item}>{item}</p>)}
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
          ICICI LIFE General Insurance Company Ltd. is one of the leading private sector general insurance companies in India offering insurance coverage for motor, health, travel, home, student travel and more.
        </p>

        <p>Insurance is the subject matter of solicitation. Please read the sales brochure carefully before concluding a sale.</p>

        <h4>Group Companies</h4>
      </section>

      {activePanel === "profile" && (
        <div className="crm-modal-overlay">
          <div className="crm-modal">
            <button type="button" className="crm-close" onClick={() => setActivePanel(null)}>
              ×
            </button>

            <h2>Customer Profile</h2>

            <div className="profile-main">
              <div className="profile-photo">{customerDetails.photo}</div>

              <div>
                <h3>{customerDetails.name}</h3>
                <p>{customerDetails.customerId}</p>
                <span className="active-badge">🟢 {customerDetails.status}</span>
              </div>
            </div>

            <h3>Personal Details</h3>
            <div className="profile-grid">
              <div><b>Email</b><p>{customerDetails.email}</p></div>
              <div><b>Phone</b><p>{customerDetails.phone}</p></div>
              <div><b>DOB</b><p>{customerDetails.dob}</p></div>
              <div><b>Gender</b><p>{customerDetails.gender}</p></div>
              <div><b>Address</b><p>{customerDetails.address}</p></div>
              <div><b>Aadhaar</b><p>{customerDetails.aadhaar}</p></div>
              <div><b>PAN</b><p>{customerDetails.pan}</p></div>
              <div><b>Nominee</b><p>{customerDetails.nominee}</p></div>
              <div><b>Relation</b><p>{customerDetails.nomineeRelation}</p></div>
            </div>

            <h3>Policy Details</h3>
            <div className="policy-card">
              <div className="policy-title-row">
                <div>
                  <h3>{customerDetails.planName}</h3>
                  <p>Policy No: {customerDetails.policyNo}</p>
                </div>
                <span className="active-badge">🟢 {customerDetails.status}</span>
              </div>

              <div className="profile-grid">
                <div><b>Policy Type</b><p>{customerDetails.policyType}</p></div>
                <div><b>Premium</b><p>{customerDetails.premium}</p></div>
                <div><b>Coverage</b><p>{customerDetails.coverage}</p></div>
                <div><b>Start Date</b><p>{customerDetails.startDate}</p></div>
                <div><b>Expiry Date</b><p>{customerDetails.expiryDate}</p></div>
                <div><b>Renewal Date</b><p>{customerDetails.renewalDate}</p></div>
              </div>
            </div>

            <h3>Advisor / Manager Details</h3>
            <div className="profile-grid">
              <div><b>Advisor</b><p>{customerDetails.advisor}</p></div>
              <div><b>Agency Manager</b><p>{customerDetails.agencyManager}</p></div>
              <div><b>Branch</b><p>{customerDetails.branch}</p></div>
            </div>
          </div>
        </div>
      )}

      {activePanel === "dashboard" && (
        <div className="crm-modal-overlay">
          <div className="crm-modal">
            <button type="button" className="crm-close" onClick={() => setActivePanel(null)}>
              ×
            </button>

            <h2>My Insurance Dashboard</h2>

            <div className="dashboard-policy-grid">
              <div className="dash-policy-card">
                <h3>{customerDetails.planName}</h3>
                <span className="active-badge">🟢 {customerDetails.status}</span>
                <p>{customerDetails.coverage}</p>
                <p>{customerDetails.premium}</p>
              </div>

              <div className="dash-policy-card">
                <h3>Renewal Date</h3>
                <p>{customerDetails.renewalDate}</p>
              </div>

              <div className="dash-policy-card">
                <h3>Claims</h3>
                <p>{customerDetails.claimsRaised} Raised</p>
                <p>{customerDetails.pendingClaims} Pending</p>
              </div>

              <div className="dash-policy-card">
                <h3>Documents</h3>
                <p>Policy PDF</p>
                <p>Receipt</p>
                <p>Health Card</p>
              </div>
            </div>

            <h3>Members Covered</h3>
            <div className="member-list">
              {customerDetails.members.map((member) => (
                <span key={member}>👤 {member}</span>
              ))}
            </div>

            <h3>Payment Details</h3>
            <div className="profile-grid">
              <div><b>Last Payment</b><p>{customerDetails.lastPayment}</p></div>
              <div><b>Next Premium</b><p>{customerDetails.nextPremium}</p></div>
              <div><b>Payment Mode</b><p>{customerDetails.paymentMode}</p></div>
              <div><b>Transaction ID</b><p>{customerDetails.transactionId}</p></div>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="chat-bubble" onClick={() => setChatOpen(true)}>
        ASK RIA<br />LIVE CHAT
      </button>

      {chatOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div>
              <h3>ASK RIA</h3>
              <p>AI Insurance Assistant</p>
            </div>
            <button type="button" onClick={() => setChatOpen(false)}>×</button>
          </div>

          <div className="chat-body">
            {messages.map((msg, index) => (
              <div key={`${msg.from}-${index}`} className={`chat-msg ${msg.from}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={chatInput}
              placeholder="Ask about claims, renewals..."
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <button type="button" onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}