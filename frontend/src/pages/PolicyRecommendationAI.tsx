import { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type FormData = {
  age: string;
  income: string;
  occupation: string;
  familyMembers: string;
  budget: string;
  goal: string;
};

type Recommendation = {
  _id: string;
  policyName: string;
  policyNumber?: string;
  premiumAmount?: number;
  status?: string;
  score: number;
  reason: string;
};

const initialForm: FormData = {
  age: "",
  income: "",
  occupation: "",
  familyMembers: "",
  budget: "",
  goal: "",
};

const getScoreBadge = (score: number): string => {
  if (score >= 80) return "badge success-badge";
  if (score >= 60) return "badge warning-badge";
  return "badge";
};

export default function PolicyRecommendationAI() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getRecommendations = async () => {
    if (!form.age || !form.income || !form.budget || !form.goal) {
      alert("Age, income, budget and goal required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<Recommendation[]>("/policy-recommendation", {
        age: Number(form.age),
        income: Number(form.income),
        occupation: form.occupation,
        familyMembers: Number(form.familyMembers || 0),
        budget: Number(form.budget),
        goal: form.goal,
      });

      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Recommendation error:", error);
      alert("Policy recommendation failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setResults([]);
  };

  return (
    <MainLayout
      title="Policy Recommendation AI"
      subtitle="Recommend best insurance policies based on customer profile"
    >
      <div className="section">
        <h2>Customer Profile</h2>

        <div className="form-grid">
          <input
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={(e) => updateForm("age", e.target.value)}
          />

          <input
            type="number"
            placeholder="Annual Income"
            value={form.income}
            onChange={(e) => updateForm("income", e.target.value)}
          />

          <input
            placeholder="Occupation"
            value={form.occupation}
            onChange={(e) => updateForm("occupation", e.target.value)}
          />

          <input
            type="number"
            placeholder="Family Members"
            value={form.familyMembers}
            onChange={(e) => updateForm("familyMembers", e.target.value)}
          />

          <input
            type="number"
            placeholder="Monthly Budget"
            value={form.budget}
            onChange={(e) => updateForm("budget", e.target.value)}
          />

          <select
            value={form.goal}
            onChange={(e) => updateForm("goal", e.target.value)}
          >
            <option value="">Select Goal</option>
            <option value="Health">Health</option>
            <option value="Tax Saving">Tax Saving</option>
            <option value="Life Cover">Life Cover</option>
            <option value="Family Protection">Family Protection</option>
            <option value="Investment">Investment</option>
          </select>
        </div>

        <div style={{ marginTop: 15 }}>
          <button
            className="btn small-btn"
            onClick={() => void getRecommendations()}
            disabled={loading}
          >
            {loading ? "Checking..." : "Get AI Recommendation"}
          </button>

          <button
            className="mini-btn"
            onClick={resetForm}
            disabled={loading}
            style={{ marginLeft: 10 }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Recommended Policies</h2>

        {results.length === 0 ? (
          <p>No recommendations yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Number</th>
                <th>Premium</th>
                <th>Status</th>
                <th>Score</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {results.map((item) => (
                <tr key={item._id}>
                  <td>{item.policyName || "Policy"}</td>
                  <td>{item.policyNumber || "N/A"}</td>
                  <td>₹{item.premiumAmount || 0}</td>
                  <td>
                    <span className="badge">{item.status || "active"}</span>
                  </td>
                  <td>
                    <span className={getScoreBadge(item.score)}>
                      {item.score}/100
                    </span>
                  </td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}