import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type PredictionData = {
  current: {
    leads: number;
    policies: number;
    totalPremium: number;
    agents: number;
  };
  prediction: {
    nextMonthRevenue: number;
    expectedPolicies: number;
    leadConversion: number;
    bestAction: string;
  };
};

const initialData: PredictionData = {
  current: {
    leads: 0,
    policies: 0,
    totalPremium: 0,
    agents: 0,
  },
  prediction: {
    nextMonthRevenue: 0,
    expectedPolicies: 0,
    leadConversion: 0,
    bestAction: "",
  },
};

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

export default function AISalesPrediction() {
  const [data, setData] = useState<PredictionData>(initialData);
  const [loading, setLoading] = useState(false);

  const loadPrediction = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get<PredictionData>("/ai-sales-prediction");
      setData(res.data || initialData);
    } catch (error) {
      console.error("AI sales prediction load error:", error);
      alert("AI Sales Prediction load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPrediction();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPrediction]);

  return (
    <MainLayout
      title="AI Sales Prediction"
      subtitle="Next month revenue, policy and conversion forecast"
    >
      <div className="cards">
        <div className="card">
          <h3>Current Leads</h3>
          <h1>{data.current.leads}</h1>
        </div>

        <div className="card">
          <h3>Current Policies</h3>
          <h1>{data.current.policies}</h1>
        </div>

        <div className="card">
          <h3>Total Premium</h3>
          <h1>{formatCurrency(data.current.totalPremium)}</h1>
        </div>

        <div className="card">
          <h3>Total Agents</h3>
          <h1>{data.current.agents}</h1>
        </div>
      </div>

      <div className="section">
        <h2>AI Forecast</h2>

        <div className="cards">
          <div className="card">
            <h3>Next Month Revenue</h3>
            <h1>{formatCurrency(data.prediction.nextMonthRevenue)}</h1>
          </div>

          <div className="card">
            <h3>Expected Policies</h3>
            <h1>{data.prediction.expectedPolicies}</h1>
          </div>

          <div className="card">
            <h3>Lead Conversion</h3>
            <h1>{data.prediction.leadConversion}%</h1>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>🤖 AI Recommendation</h2>

        <div className="lead-card">
          <h3>Best Action</h3>
          <p>{data.prediction.bestAction || "No recommendation available."}</p>
        </div>

        <button
          className="btn small-btn"
          onClick={() => void loadPrediction()}
          disabled={loading}
          style={{ marginTop: 15 }}
        >
          {loading ? "Refreshing..." : "Refresh Prediction"}
        </button>
      </div>
    </MainLayout>
  );
}