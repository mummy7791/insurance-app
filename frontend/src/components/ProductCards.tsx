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

export default function ProductCards() {
  return (
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
              <button>Check price</button>
              <button className="outline-btn">Explore</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}