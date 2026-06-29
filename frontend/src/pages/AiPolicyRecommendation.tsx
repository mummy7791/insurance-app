import { useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
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

type RecommendedPlan = {
  category: Category;
  planName: string;
  coverageAmount: number;
  paymentYears: number;
  reason: string;
  riskScore: number;
  priorityScore: number;
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

export default function AiPolicyRecommendation() {
  const [form, setForm] = useState({
    name: "",
    age: "25",
    gender: "Female",
    occupation: "",
    annualIncome: "300000",
    maritalStatus: "Single",
    children: "0",
    goal: "family protection",
    healthIssue: "No",
    budget: "5000",
  });

  const [premium, setPremium] = useState<PremiumResponse | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<RecommendedPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const aiPlan = useMemo<RecommendedPlan>(() => {
    const age = Number(form.age || 0);
    const income = Number(form.annualIncome || 0);
    const children = Number(form.children || 0);
    const goal = form.goal.toLowerCase();
    const healthIssue = form.healthIssue.toLowerCase();

    let category: Category = "Life Insurance";
    let planName = "Term Insurance";
    let coverageAmount = Math.max(income * 10, 3000000);
    let paymentYears = 1;
    let reason = "Family financial protection kosam term insurance best.";
    let riskScore = 40;
    let priorityScore = 70;

    if (goal.includes("health") || healthIssue === "yes") {
      category = "Health Insurance";
      planName = "Family Floater Health Plan";
      coverageAmount = 500000;
      reason = "Medical expenses and hospitalization cover kosam health plan best.";
      riskScore += 20;
      priorityScore += 10;
    }

    if (goal.includes("education") || children > 0) {
      category = "Education Insurance";
      planName = "Education Returns Plan";
      coverageAmount = 200000;
      paymentYears = 4;
      reason = "Children education support kosam Education Returns Plan suitable.";
      priorityScore += 15;
    }

    if (goal.includes("retirement") || age >= 45) {
      category = "Pension Retirement Plan";
      planName = "Retirement Pension Plan";
      coverageAmount = 500000;
      paymentYears = 10;
      reason = "Retirement income security kosam pension plan suitable.";
      riskScore += 10;
    }

    if (goal.includes("travel")) {
      category = "Travel Insurance";
      planName = "Travel Protect";
      coverageAmount = 1000000;
      paymentYears = 1;
      reason = "Travel emergency, baggage loss, passport loss kosam travel cover.";
    }

    if (goal.includes("accident")) {
      category = "Personal Accident Insurance";
      planName = "Personal Accident Cover";
      coverageAmount = 1000000;
      paymentYears = 1;
      reason = "Accidental death/disability protection kosam accident cover.";
      riskScore += 15;
    }

    if (goal.includes("cancer")) {
      category = "Cancer Insurance";
      planName = "Cancer Shield";
      coverageAmount = 1500000;
      paymentYears = 1;
      reason = "Cancer treatment expenses kosam special cancer plan.";
      riskScore += 25;
    }

    if (age > 35) riskScore += 10;
    if (age > 45) riskScore += 15;
    if (age > 60) riskScore += 25;
    if (form.maritalStatus === "Married") priorityScore += 10;
    if (children > 0) priorityScore += 10;

    return {
      category,
      planName,
      coverageAmount,
      paymentYears,
      reason,
      riskScore: Math.min(riskScore, 100),
      priorityScore: Math.min(priorityScore, 100),
    };
  }, [form]);

  const calculatePremium = async (plan: RecommendedPlan) => {
    try {
      setLoading(true);

      const res = await api.post<PremiumResponse>(
        "/insurance-plans/calculate-premium",
        {
          category: plan.category,
          coverageAmount: plan.coverageAmount,
          age: Number(form.age),
          paymentYears: plan.paymentYears,
        }
      );

      setSelectedPlan(plan);
      setPremium(res.data);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Premium calculation failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout
      title="AI Policy Recommendation"
      subtitle="Customer details batti best insurance plan auto suggest chestundi"
    >
      <div className="section">
        <h2>Customer Details</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />

          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>

          <input
            placeholder="Occupation"
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
          />

          <input
            type="number"
            placeholder="Annual Income"
            value={form.annualIncome}
            onChange={(e) =>
              setForm({ ...form, annualIncome: e.target.value })
            }
          />

          <select
            value={form.maritalStatus}
            onChange={(e) =>
              setForm({ ...form, maritalStatus: e.target.value })
            }
          >
            <option>Single</option>
            <option>Married</option>
          </select>

          <input
            type="number"
            placeholder="Children"
            value={form.children}
            onChange={(e) => setForm({ ...form, children: e.target.value })}
          />

          <select
            value={form.healthIssue}
            onChange={(e) => setForm({ ...form, healthIssue: e.target.value })}
          >
            <option>No</option>
            <option>Yes</option>
          </select>

          <select
  value={form.goal}
  onChange={(e) => setForm({ ...form, goal: e.target.value })}
>
  {categories.map((item) => (
    <option key={item} value={item}>
      {item}
    </option>
  ))}
</select>

          <input
            type="number"
            placeholder="Budget"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </div>
      </div>

      <div className="section">
        <h2>AI Recommendation</h2>

        <div className="cards">
          <div className="card">
            <h3>Recommended Plan</h3>
            <h1 style={{ fontSize: 24 }}>{aiPlan.planName}</h1>
          </div>

          <div className="card">
            <h3>Category</h3>
            <h1 style={{ fontSize: 22 }}>{aiPlan.category}</h1>
          </div>

          <div className="card">
            <h3>Coverage</h3>
            <h1>₹{aiPlan.coverageAmount}</h1>
          </div>

          <div className="card">
            <h3>Payment Years</h3>
            <h1>{aiPlan.paymentYears}</h1>
          </div>

          <div className="card">
            <h3>Risk Score</h3>
            <h1>{aiPlan.riskScore}%</h1>
          </div>

          <div className="card">
            <h3>Priority Score</h3>
            <h1>{aiPlan.priorityScore}%</h1>
          </div>
        </div>

        <p style={{ marginTop: 15 }}>
          <b>AI Reason:</b> {aiPlan.reason}
        </p>

        <button
          className="btn small-btn"
          onClick={() => void calculatePremium(aiPlan)}
          disabled={loading}
        >
          {loading ? "Calculating..." : "Calculate Premium"}
        </button>
      </div>

      {selectedPlan && premium && (
        <div className="section">
          <h2>Final Quote</h2>

          <table className="table">
            <tbody>
              <tr>
                <th>Plan</th>
                <td>{selectedPlan.planName}</td>
              </tr>
              <tr>
                <th>Category</th>
                <td>{premium.category}</td>
              </tr>
              <tr>
                <th>Coverage</th>
                <td>₹{premium.coverageAmount}</td>
              </tr>
              <tr>
                <th>Age</th>
                <td>{premium.age}</td>
              </tr>
              <tr>
                <th>Payment Years</th>
                <td>{premium.paymentYears}</td>
              </tr>
              <tr>
                <th>Yearly Premium</th>
                <td>
                  <b>₹{premium.yearlyPremium}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}