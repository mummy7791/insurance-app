import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";
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

  const continueToAccount = () => {
    sessionStorage.setItem("premiumEstimate", JSON.stringify(result));
  };

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
    <div className="calculator-page">
      <div className="calculator-shell">
        <header className="calculator-header"><Link className="public-brand" to="/"><span>S</span>SecureLife</Link><Link to="/" className="mini-btn">Back to home</Link></header>
        <div className="calculator-intro"><span className="eyebrow">PLAN AHEAD</span><h1>Estimate your protection premium.</h1><p>Choose your cover, age and payment term for an indicative annual estimate.</p></div>

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
            <span className="eyebrow">YOUR ESTIMATE</span><h2>Premium Result</h2>

            <div className="cards">
              <div className="card">
                <h3>Category</h3>
                <h1 style={{ fontSize: 24 }}>{result.category}</h1>
              </div>

              <div className="card">
                <h3>Coverage</h3>
                <h1>₹{result.coverageAmount.toLocaleString("en-IN")}</h1>
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
                <h1>₹{result.yearlyPremium.toLocaleString("en-IN")}</h1>
              </div>
            </div>
            <p className="muted-copy">This is an indicative estimate. Final premium may change after proposal review and underwriting.</p>
            <div className="calculator-actions"><Link className="btn small-btn" to="/register" onClick={continueToAccount}>Create free account</Link><Link className="mini-btn" to="/login" onClick={continueToAccount}>Already have an account</Link></div>
          </div>
        )}
      </div>
    </div>
  );
}