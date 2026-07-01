import { useEffect, useState } from "react";

const slides = [
  {
    tag: "Service Assure",
    title: "Car troubles? Not on our watch",
    text: "Our car insurance now comes with Service Assure – 30 min roadside assistance promise.",
    icon: "🚘",
  },
  {
    tag: "Health Cover",
    title: "Cashless treatment made simple",
    text: "Get access to network hospitals and quick claim support for your family.",
    icon: "🏥",
  },
  {
    tag: "Travel Safe",
    title: "Travel worry-free worldwide",
    text: "Coverage for missed flights, baggage loss and emergency medical needs.",
    icon: "✈️",
  },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[index];

  const next = () => {
    setIndex((prev) => (prev + 1) % slides.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="hero-slider">
      <button className="slider-arrow left" onClick={prev}>
        ‹
      </button>

      <div className="hero-slide fade-slide">
        <div className="hero-content">
          <p className="tag">{slide.tag}</p>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
        </div>

        <div className="hero-visual">
          <span>{slide.icon}</span>
        </div>
      </div>

      <button className="slider-arrow right" onClick={next}>
        ›
      </button>

      <div className="slider-dots">
        {slides.map((item, i) => (
          <button
            key={item.title}
            className={i === index ? "active" : ""}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}