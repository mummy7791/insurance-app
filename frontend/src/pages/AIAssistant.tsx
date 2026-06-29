import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type PremiumItem = {
  _id: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
};

type ClaimItem = {
  _id: string;
  claimAmount?: number;
  status?: string;
  createdAt?: string;
};

type LeadItem = {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  leadStatus?: string;
  createdAt?: string;
};

type PolicyItem = {
  _id: string;
  policyName?: string;
  policyNumber?: string;
  status?: string;
  expiryDate?: string;
  renewalDate?: string;
};

type Recommendation = {
  type: string;
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
};

type AISummary = {
  leads: number;
  customers: number;
  policies: number;
  premiums: number;
  claims: number;
  users: number;
  duePremiums: PremiumItem[];
  pendingClaims: ClaimItem[];
};

type AIRecommendations = {
  recommendations: Recommendation[];
  hotLeads: LeadItem[];
  premiumAlerts: PremiumItem[];
  policyRenewals: PolicyItem[];
  claimAlerts: ClaimItem[];
};

type AIResponse = {
  answer: string;
};

type ChatMessage = {
  sender: "user" | "ai";
  text: string;
};

const initialSummary: AISummary = {
  leads: 0,
  customers: 0,
  policies: 0,
  premiums: 0,
  claims: 0,
  users: 0,
  duePremiums: [],
  pendingClaims: [],
};

const initialRecommendations: AIRecommendations = {
  recommendations: [],
  hotLeads: [],
  premiumAlerts: [],
  policyRenewals: [],
  claimAlerts: [],
};

const quickQuestions = [
  "What should I follow up today?",
  "Show premium due insights",
  "How many claims are pending?",
  "How can I improve lead conversion?",
  "Give customer retention tips",
];

const priorityClass = (priority: Recommendation["priority"]) => {
  if (priority === "high") return "badge danger-badge";
  if (priority === "medium") return "badge warning-badge";
  return "badge";
};

export default function AIAssistant() {
  const [summary, setSummary] = useState<AISummary>(initialSummary);
  const [smartData, setSmartData] =
    useState<AIRecommendations>(initialRecommendations);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am your LifeSecure CRM Assistant. Ask me about leads, customers, premiums, policies, claims, or agent performance.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);

  const loadAIData = useCallback(async () => {
    try {
      setLoading(true);

      const [summaryRes, recommendationsRes] = await Promise.all([
        api.get<AISummary>("/ai/summary"),
        api.get<AIRecommendations>("/ai/recommendations"),
      ]);

      setSummary(summaryRes.data || initialSummary);
      setSmartData(recommendationsRes.data || initialRecommendations);
    } catch (error) {
      console.error("AI data load error:", error);
      alert("AI assistant data load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAIData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAIData]);

  const askAI = async (customQuestion?: string) => {
    const finalQuestion = customQuestion || question;

    if (!finalQuestion.trim()) {
      alert("Please enter a question");
      return;
    }

    try {
      setAsking(true);

      setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text: finalQuestion,
        },
      ]);

      setQuestion("");

      const res = await api.post<AIResponse>("/ai/ask", {
        question: finalQuestion,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.data.answer,
        },
      ]);
    } catch (error) {
      console.error("AI ask error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, I could not process your question. Please check backend server.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <MainLayout
      title="AI CRM Assistant"
      subtitle="Smart follow-ups, premium alerts, renewal alerts and claim insights"
    >
      {loading && <p>Loading AI assistant...</p>}

      <div className="cards">
        <div className="card">
          <h3>Total Leads</h3>
          <h1>{summary.leads}</h1>
        </div>
        <div className="card">
          <h3>Customers</h3>
          <h1>{summary.customers}</h1>
        </div>
        <div className="card">
          <h3>Policies</h3>
          <h1>{summary.policies}</h1>
        </div>
        <div className="card">
          <h3>Premiums</h3>
          <h1>{summary.premiums}</h1>
        </div>
        <div className="card">
          <h3>Claims</h3>
          <h1>{summary.claims}</h1>
        </div>
        <div className="card">
          <h3>Users</h3>
          <h1>{summary.users}</h1>
        </div>
      </div>

      <div className="section">
        <h2>🤖 Today&apos;s AI Recommendations</h2>

        {smartData.recommendations.length === 0 ? (
          <p>No recommendations found.</p>
        ) : (
          <div className="lead-grid">
            {smartData.recommendations.map((item) => (
              <div className="lead-card" key={`${item.type}-${item.title}`}>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <span className={priorityClass(item.priority)}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2>Smart Follow-up Lists</h2>

        <div className="lead-grid">
          <div className="lead-card">
            <h3>🔥 Hot Leads</h3>
            {smartData.hotLeads.length === 0 ? (
              <p>No hot leads found.</p>
            ) : (
              smartData.hotLeads.map((lead) => (
                <p key={lead._id}>
                  {lead.name || "Lead"} - {lead.phone || lead.email || "N/A"}
                </p>
              ))
            )}
          </div>

          <div className="lead-card">
            <h3>💰 Premium Due</h3>
            {smartData.premiumAlerts.length === 0 ? (
              <p>No premium alerts found.</p>
            ) : (
              smartData.premiumAlerts.map((item) => (
                <p key={item._id}>
                  ₹{item.amount || 0} - {item.status || "pending"}
                </p>
              ))
            )}
          </div>

          <div className="lead-card">
            <h3>📄 Policy Renewals</h3>
            {smartData.policyRenewals.length === 0 ? (
              <p>No renewal alerts found.</p>
            ) : (
              smartData.policyRenewals.map((policy) => (
                <p key={policy._id}>
                  {policy.policyName || policy.policyNumber || "Policy"} -{" "}
                  {policy.status || "active"}
                </p>
              ))
            )}
          </div>

          <div className="lead-card">
            <h3>⚠️ Pending Claims</h3>
            {smartData.claimAlerts.length === 0 ? (
              <p>No pending claims found.</p>
            ) : (
              smartData.claimAlerts.map((item) => (
                <p key={item._id}>
                  ₹{item.claimAmount || 0} - {item.status || "pending"}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Quick AI Questions</h2>

        <div className="form-grid">
          {quickQuestions.map((item) => (
            <button
              key={item}
              className="mini-btn"
              onClick={() => askAI(item)}
              disabled={asking}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Ask AI Assistant</h2>

        <div className="form-grid">
          <input
            placeholder="Example: Which customers should I follow up today?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void askAI();
              }
            }}
          />

          <button
            className="btn small-btn"
            onClick={() => askAI()}
            disabled={asking}
          >
            {asking ? "Thinking..." : "Ask AI"}
          </button>

          <button className="mini-btn" onClick={loadAIData}>
            Refresh AI Data
          </button>
        </div>
      </div>

      <div className="section">
        <h2>AI Chat</h2>

        <div className="ai-chat-box">
          {messages.map((msg, index) => (
            <div
              key={`${msg.sender}-${index}`}
              className={msg.sender === "ai" ? "ai-message" : "user-message"}
            >
              <strong>{msg.sender === "ai" ? "🤖 AI" : "👤 You"}</strong>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}