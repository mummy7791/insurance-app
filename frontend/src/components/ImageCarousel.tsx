import { useEffect, useState } from "react";

const carouselItems = [
  {
    title: "Dependable",
    subtitle: "You can rely on us at all times.",
    text: "We stand by customers during emergencies, accidents and unexpected situations.",
    icon: "🛡️",
  },
  {
    title: "Approachable",
    subtitle: "You've got a friend in us.",
    text: "Our support team helps you with claims, renewals, quotes and policy support.",
    icon: "🤝",
  },
  {
    title: "Transparent",
    subtitle: "We give you the power of clarity.",
    text: "Simple policy details, clear premiums and easy claim tracking.",
    icon: "🔍",
  },
];

export default function ImageCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % carouselItems.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  const item = carouselItems[index];

  return (
    <div className="image-carousel-card">
      <div className="image-carousel-visual">
        <span>{item.icon}</span>
      </div>

      <div className="image-carousel-content">
        <h3>{item.title}</h3>
        <h4>{item.subtitle}</h4>
        <p>{item.text}</p>
      </div>

      <div className="image-carousel-dots">
        {carouselItems.map((dot, i) => (
          <button
            key={dot.title}
            className={i === index ? "active" : ""}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}