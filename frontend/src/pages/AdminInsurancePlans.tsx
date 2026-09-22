import { useCallback, useEffect, useMemo, useState } from "react";
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

type PlanStatus = "Pending" | "Approved" | "Rejected" | "Active" | "Inactive";

type Plan = {
  _id: string;
  planName: string;
  category: Category;
  planType?: string;
  productGroup?: string;
  policyTermYears?: number;
  premiumFrequencies?: string[];
  pricingRules?: { baseAge?: number; ageRatePercent?: number; smokerLoadingPercent?: number; femaleDiscountPercent?: number };
  coverageAmount?: number;
  yearlyPremium?: number;
  yearlyAmount?: number;
  paymentYears?: number;
  ageMin?: number;
  ageMax?: number;
  eligibleFrom?: string;
  eligibleTo?: string;
  benefits?: string[];
  coverage?: string;
  description?: string;
  premiumMode?: "auto" | "manual";
  status: PlanStatus;
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

const initialForm = {
  planName: "",
  category: "Life Insurance" as Category,
  planType: "",
  productGroup: "Term / Health Products",
  policyTermYears: "10",
  premiumFrequencies: "Yearly,Half-Yearly,Quarterly,Monthly",
  baseAge: "25",
  ageRatePercent: "2",
  smokerLoadingPercent: "15",
  femaleDiscountPercent: "0",
  coverageAmount: "3000000",
  yearlyPremium: "",
  paymentYears: "1",
  ageMin: "18",
  ageMax: "60",
  eligibleFrom: "",
  eligibleTo: "",
  benefits: "",
  coverage: "",
  description: "",
  premiumMode: "auto" as "auto" | "manual",
  age: "25",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  }
  return fallback;
};

function AdminInsurancePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const filteredPlans = useMemo(() => plans.filter((plan) => `${plan.planName} ${plan.category} ${plan.planType || ""} ${plan.status}`.toLowerCase().includes(search.toLowerCase())), [plans, search]);

  const fetchPlans = useCallback(async (): Promise<Plan[]> => {
    const res = await api.get<Plan[]>("/insurance-plans/admin/all");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPlans();
      setPlans(data);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Plans load failed"));
    } finally {
      setLoading(false);
    }
  }, [fetchPlans]);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);

      void fetchPlans()
        .then((data) => {
          if (active) setPlans(data);
        })
        .catch((error: unknown) => {
          alert(getErrorMessage(error, "Plans load failed"));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [fetchPlans]);

  const calculatePremium = async () => {
    try {
      const res = await api.post<{ yearlyPremium: number }>(
        "/insurance-plans/calculate-premium",
        {
          category: form.category,
          coverageAmount: Number(form.coverageAmount),
          age: Number(form.age),
          paymentYears: Number(form.paymentYears),
        }
      );

      setForm((prev) => ({
        ...prev,
        yearlyPremium: String(res.data.yearlyPremium),
      }));
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Premium calculation failed"));
    }
  };

  const createPlan = async () => {
    if (!form.planName || !form.category || !form.coverageAmount) {
      alert("Plan name, category and coverage required");
      return;
    }

    try {
      setSaving(true);

      const benefitsArray = form.benefits
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await api.post("/insurance-plans", {
        planName: form.planName,
        category: form.category,
        planType: form.planType,
        productGroup: form.productGroup,
        policyTermYears: Number(form.policyTermYears || form.paymentYears || 1),
        premiumFrequencies: form.premiumFrequencies.split(",").map((x) => x.trim()).filter(Boolean),
        pricingRules: { baseAge: Number(form.baseAge || 25), ageRatePercent: Number(form.ageRatePercent || 0), smokerLoadingPercent: Number(form.smokerLoadingPercent || 0), femaleDiscountPercent: Number(form.femaleDiscountPercent || 0) },
        coverageAmount: Number(form.coverageAmount),
        yearlyPremium: Number(form.yearlyPremium || 0),
        yearlyAmount: Number(form.yearlyPremium || 0),
        paymentYears: Number(form.paymentYears || 1),
        ageMin: Number(form.ageMin || 0),
        ageMax: Number(form.ageMax || 100),
        eligibleFrom: form.eligibleFrom,
        eligibleTo: form.eligibleTo,
        benefits: benefitsArray,
        coverage: form.coverage,
        description: form.description,
        premiumMode: form.premiumMode,
        age: Number(form.age || 25),
        status: "Approved",
      });

      alert("Plan created successfully");
      setForm(initialForm);
      void loadPlans();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Plan create failed"));
    } finally {
      setSaving(false);
    }
  };

  const seedDefaultPlans = async () => {
    if (
      !window.confirm(
        "Default plans create cheyyala? Existing plans delete avuthayi."
      )
    ) {
      return;
    }

    try {
      await api.post("/insurance-plans/seed-default");
      alert("Default plans created");
      void loadPlans();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Default plans create failed"));
    }
  };

  const updateApproval = async (id: string, status: PlanStatus) => {
    try {
      await api.put(`/insurance-plans/${id}/approval`, { status });
      void loadPlans();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Status update failed"));
    }
  };

  const deletePlan = async (id: string) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await api.delete(`/insurance-plans/${id}`);
      setPlans((prev) => prev.filter((item) => item._id !== id));
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Plan delete failed"));
    }
  };

  return (
    <MainLayout
      title="Admin Insurance Plans"
      subtitle="Create, approve, calculate and manage insurance plans"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">PRODUCT CONTROL</span><h2>Insurance product workspace</h2><p>Create customer-facing products, calculate premiums and control plan availability.</p></div><div className="admin-summary-metrics"><div><span>Total</span><strong>{plans.length}</strong></div><div><span>Approved</span><strong>{plans.filter((p) => p.status === "Approved").length}</strong></div><div><span>Pending</span><strong>{plans.filter((p) => p.status === "Pending").length}</strong></div></div></div>

      <div className="cards admin-kpi-grid">
        <div className="card">
          <h3>Total Plans</h3>
          <h1>{plans.length}</h1>
        </div>

        <div className="card">
          <h3>Approved</h3>
          <h1>{plans.filter((p) => p.status === "Approved").length}</h1>
        </div>

        <div className="card">
          <h3>Pending</h3>
          <h1>{plans.filter((p) => p.status === "Pending").length}</h1>
        </div>

        <div className="card">
          <h3>Rejected</h3>
          <h1>{plans.filter((p) => p.status === "Rejected").length}</h1>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">NEW INSURANCE PRODUCT</span><h2>Create insurance plan</h2><p className="section-copy">Configure cover, eligibility, benefits and premium before publishing the product.</p>

        <div className="form-grid">
          <input
            placeholder="Plan Name"
            value={form.planName}
            onChange={(e) => setForm({ ...form, planName: e.target.value })}
          />

          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as Category })
            }
          >
            {categories.map((cat) => (
              <option value={cat} key={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            placeholder="Plan Type"
            value={form.planType}
            onChange={(e) => setForm({ ...form, planType: e.target.value })}
          />

          <select value={form.productGroup} onChange={(e) => setForm({ ...form, productGroup: e.target.value })}>
            {["ULIPS","Traditional Products","Term / Health Products","Pension Products","iSolutions","Other"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <input placeholder="Policy Term Years" value={form.policyTermYears} onChange={(e) => setForm({ ...form, policyTermYears: e.target.value })} />
          <input placeholder="Premium Frequencies comma separated" value={form.premiumFrequencies} onChange={(e) => setForm({ ...form, premiumFrequencies: e.target.value })} />
          <input placeholder="Base Age" value={form.baseAge} onChange={(e) => setForm({ ...form, baseAge: e.target.value })} />
          <input placeholder="Age Loading % per year" value={form.ageRatePercent} onChange={(e) => setForm({ ...form, ageRatePercent: e.target.value })} />
          <input placeholder="Smoker Loading %" value={form.smokerLoadingPercent} onChange={(e) => setForm({ ...form, smokerLoadingPercent: e.target.value })} />
          <input placeholder="Female Discount %" value={form.femaleDiscountPercent} onChange={(e) => setForm({ ...form, femaleDiscountPercent: e.target.value })} />

          <input
            placeholder="Coverage Amount"
            value={form.coverageAmount}
            onChange={(e) =>
              setForm({ ...form, coverageAmount: e.target.value })
            }
          />

          <select
            value={form.premiumMode}
            onChange={(e) =>
              setForm({
                ...form,
                premiumMode: e.target.value as "auto" | "manual",
              })
            }
          >
            <option value="auto">Auto Calculate</option>
            <option value="manual">Manual Premium</option>
          </select>

          <input
            placeholder="Customer Age for Auto"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />

          <input
            placeholder="Yearly Premium"
            value={form.yearlyPremium}
            onChange={(e) =>
              setForm({ ...form, yearlyPremium: e.target.value })
            }
            disabled={form.premiumMode === "auto"}
          />

          <input
            placeholder="Payment Years"
            value={form.paymentYears}
            onChange={(e) => setForm({ ...form, paymentYears: e.target.value })}
          />

          <input
            placeholder="Age Min"
            value={form.ageMin}
            onChange={(e) => setForm({ ...form, ageMin: e.target.value })}
          />

          <input
            placeholder="Age Max"
            value={form.ageMax}
            onChange={(e) => setForm({ ...form, ageMax: e.target.value })}
          />

          <input
            placeholder="Eligible From"
            value={form.eligibleFrom}
            onChange={(e) =>
              setForm({ ...form, eligibleFrom: e.target.value })
            }
          />

          <input
            placeholder="Eligible To"
            value={form.eligibleTo}
            onChange={(e) => setForm({ ...form, eligibleTo: e.target.value })}
          />

          <input
            placeholder="Benefits comma separated"
            value={form.benefits}
            onChange={(e) => setForm({ ...form, benefits: e.target.value })}
          />

          <input
            placeholder="Coverage"
            value={form.coverage}
            onChange={(e) => setForm({ ...form, coverage: e.target.value })}
          />

          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <button
            className="mini-btn"
            onClick={() => void calculatePremium()}
            disabled={form.premiumMode === "manual"}
          >
            Calculate Premium
          </button>

          <button
            className="btn small-btn"
            onClick={() => void createPlan()}
            disabled={saving}
            style={{ marginLeft: 10 }}
          >
            {saving ? "Saving..." : "Create Plan"}
          </button>

          <button
            className="mini-btn"
            onClick={() => void seedDefaultPlans()}
            style={{ marginLeft: 10 }}
          >
            Seed Default Plans
          </button>
        </div>
      </div>

      <div className="section admin-table-section">
        <div className="section-heading-row"><div><span className="eyebrow">PRODUCT CATALOGUE</span><h2>All plans</h2></div><button className="mini-btn" onClick={() => void loadPlans()}>Refresh</button></div>
        <div className="admin-search-bar"><input placeholder="Search plan, category, type or status" value={search} onChange={(e) => setSearch(e.target.value)} /><span>{filteredPlans.length} plans</span></div>

        {loading ? (
          <p>Loading plans...</p>
        ) : filteredPlans.length === 0 ? (
          <p>No plans found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Category</th>
                <th>Smart Quote</th>
                <th>Coverage</th>
                <th>Premium</th>
                <th>Years</th>
                <th>Status</th>
                <th>Benefits</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan._id}>
                  <td>
                    <strong>{plan.planName}</strong>
                    <br />
                    <small>{plan.planType || "N/A"}</small>
                  </td>

                  <td>{plan.category}</td>
                  <td><strong>{plan.productGroup || "Other"}</strong><br/><small>Term {plan.policyTermYears || plan.paymentYears || 1}y · Age load {plan.pricingRules?.ageRatePercent || 0}%</small></td>
                  <td>₹{Number(plan.coverageAmount || 0).toLocaleString("en-IN")}</td>
                  <td>₹{Number(plan.yearlyPremium || plan.yearlyAmount || 0).toLocaleString("en-IN")}</td>
                  <td>{plan.paymentYears || 1}</td>

                  <td>
                    <span className="badge">{plan.status}</span>
                  </td>

                  <td>
                    {Array.isArray(plan.benefits)
                      ? plan.benefits.join(", ")
                      : "N/A"}
                  </td>

                  <td>
                    <button
                      className="mini-btn"
                      onClick={() => void updateApproval(plan._id, "Approved")}
                    >
                      Approve
                    </button>

                    <button
                      className="mini-btn"
                      onClick={() => void updateApproval(plan._id, "Rejected")}
                      style={{ marginLeft: 5 }}
                    >
                      Reject
                    </button>

                    <button
                      className="mini-btn danger-btn"
                      onClick={() => void deletePlan(plan._id)}
                      style={{ marginLeft: 5 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}

export default AdminInsurancePlans;