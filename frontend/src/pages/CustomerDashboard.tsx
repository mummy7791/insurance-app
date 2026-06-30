import { useState } from "react";
import "../styles/LombardHome.css";

type User = {
  name?: string;
  email?: string;
  role?: string;
  branch?: string;
};

export default function CustomerDashboard() {
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
        <span>💬 Live Chat</span>
        <span>Help</span>
        <span>Info Centre</span>
        <span>Investor Relations</span>
        <button>Become an advisor</button>
        <button onClick={logout}>Login</button>
      </div>

      <div className="main-nav">
        <div className="brand">
          <img src="/ic_launcher.png" alt="ICICI LIFE" />
          <div>
            <h2>ICICI LIFE</h2>
            <p>Insurance CRM</p>
          </div>
        </div>

        <nav>
          <a>Motor Insurance</a>
          <a>Health Insurance</a>
          <a>Travel Insurance</a>
          <a>SME Insurance</a>
          <a>Corporate Insurance</a>
          <a>Other Insurance</a>
          <a>Renewals</a>
          <a>Claims</a>
        </nav>
      </div>

      <div className="ticker">
        Introducing Service Assure — 30-min roadside assistance promise. Now live with ICICI LIFE insurance.
      </div>

      <section className="hero">
        <div className="hero-text">
          <p className="tag">Service Assure</p>
          <h1>Car troubles? Not on our watch</h1>
          <p>
            Our insurance now comes with fast support, easy policies and smooth claims.
          </p>
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
          <label>
            Car registration no.*
            <input placeholder="E.g. MH01DF5698" />
          </label>

          <label>
            Mobile number*
            <input placeholder="Enter mobile no." />
          </label>

          <label>
            Email*
            <input placeholder="Enter email address" />
          </label>

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

      <section className="why">
        <h2>Why choose ICICI LIFE?</h2>

        <div className="why-grid">
          <div>
            <h3>Dependable</h3>
            <p>You can rely on us at all times. We stand with customers in every emergency.</p>
          </div>

          <div>
            <h3>Approachable</h3>
            <p>Need help? Our support team guides you through policies, payments and claims.</p>
          </div>

          <div>
            <h3>Transparent</h3>
            <p>Simple policy details, clear premium information and easy claim tracking.</p>
          </div>
        </div>
      </section>

      <section className="products">
        <h2>Our products</h2>

        <div className="product-grid">
          {[
            ["Car", "Cashless repair & claims process"],
            ["Bike", "Cashless garage network"],
            ["Health", "Personalised policies for all budgets"],
            ["Travel", "Coverage for missed flights and baggage"],
          ].map(([title, desc]) => (
            <div className="product-card" key={title}>
              <h3>{title}</h3>
              <p>{desc}</p>
              <button>Explore</button>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <h3>ICICI LIFE Insurance CRM</h3>
        <p>Customer Support | Policies | Claims | Renewals | Privacy Policy</p>
        <p>Contact - 1800 2666 Available 24 x 7</p>
      </footer>
    </div>
  );
}