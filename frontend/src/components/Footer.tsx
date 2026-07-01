import { footerData } from "../data/footerData";

export default function Footer() {
  return (
    <>
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
    </>
  );
}