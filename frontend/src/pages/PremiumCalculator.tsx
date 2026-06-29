import { useState } from "react";
import api from "../services/api";

type Category =
  | "Life Insurance"
  | "Health Insurance"
  | "Medical Insurance"
  | "Education Insurance"
  | "Personal Accident Insurance"
  | "Disability Insurance"
  | "Cancer Insurance"
  | "Maternity Insurance"
  | "Travel Insurance"
  | "Pension Retirement Plan";

type PremiumResponse = {
  category: Category;
  coverageAmount: number;
  age: number;
  paymentYears: number;
  yearlyPremium: number;
};

const categories: Category[] = [
  "Life Insurance",
  "Health Insurance",
  "Medical Insurance",
  "Education Insurance",
  "Personal Accident Insurance",
  "Disability Insurance",
  "Cancer Insurance",
  "Maternity Insurance",
  "Travel Insurance",
  "Pension Retirement Plan",
];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  }

  return fallback;
};

export default function PremiumCalculator() {
  const [category, setCategory] = useState<Category>("Life Insurance");
  const [coverageAmount, setCoverageAmount] = useState("3000000");
  const [age, setAge] = useState("25");
  const [paymentYears, setPaymentYears] = useState("1");
  const [result, setResult] = useState<PremiumResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const calculatePremium = async () => {
    if (!category || !coverageAmount || !age) {
      alert("Category, coverage amount and age required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<PremiumResponse>(
        "/insurance-plans/calculate-premium",
        {
          category,
          coverageAmount: Number(coverageAmount),
          age: Number(age),
          paymentYears: Number(paymentYears || 1),
        }
      );

      setResult(res.data);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Premium calculation failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#b8003c,#10264f)",
        padding: 30,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 24,
          padding: 30,
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        }}
      >
        <h1>🧮 Premium Calculator</h1>
        <p>LifeSecure CRM public premium calculation</p>

        <div className="form-grid">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Coverage Amount"
            value={coverageAmount}
            onChange={(e) => setCoverageAmount(e.target.value)}
          />

          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <input
            type="number"
            placeholder="Payment Years"
            value={paymentYears}
            onChange={(e) => setPaymentYears(e.target.value)}
          />
        </div>

        <button
          className="btn small-btn"
          onClick={() => void calculatePremium()}
          disabled={loading}
          style={{ marginTop: 20 }}
        >
          {loading ? "Calculating..." : "Calculate Premium"}
        </button>

        {result && (
          <div className="section" style={{ marginTop: 25 }}>
            <h2>Premium Result</h2>

            <div className="cards">
              <div className="card">
                <h3>Category</h3>
                <h1 style={{ fontSize: 24 }}>{result.category}</h1>
              </div>

              <div className="card">
                <h3>Coverage</h3>
                <h1>₹{result.coverageAmount}</h1>
              </div>

              <div className="card">
                <h3>Age</h3>
                <h1>{result.age}</h1>
              </div>

              <div className="card">
                <h3>Payment Years</h3>
                <h1>{result.paymentYears}</h1>
              </div>

              <div className="card">
                <h3>Yearly Premium</h3>
                <h1>₹{result.yearlyPremium}</h1>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}