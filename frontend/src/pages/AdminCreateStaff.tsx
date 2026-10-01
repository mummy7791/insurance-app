import { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type StaffRole = "bm" | "unit_manager" | "agency_manager" | "advisor" | "agent";

type CreateStaffResponse = {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: StaffRole;
    branch?: string;
    permissions?: string[];
  };
};

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  branch: "",
  role: "advisor" as StaffRole,
};

export default function AdminCreateStaff() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const createStaff = async () => {
    setSuccess("");
    setError("");

    if (!form.name || !form.email || !form.password || !form.role) {
      setError("Name, email, password and role required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post<CreateStaffResponse>("/auth/create-staff", form);

      setSuccess(res.data.message || "Staff created successfully");
      setForm(initialForm);


    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || "Staff create failed");
      } else {
        setError("Staff create failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout
      title="Create Staff"
      subtitle="Admin can create BM, Unit Manager, Agency Manager, Advisor and Agent"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">ACCESS MANAGEMENT</span><h2>Create staff access</h2><p>Create controlled SecureLife accounts for operations roles. Credentials and access remain role-based.</p></div><span className="secure-chip">Admin only</span></div>

      <div className="section">
        <span className="eyebrow">NEW STAFF ACCOUNT</span><h2>Create Staff User</h2><p className="section-copy">Enter staff identity, branch and role. The configured verification workflow will be triggered after account creation.</p>

        {success && <div className="admin-success-state">✓ {success}</div>}
        {error && <div className="checkout-inline-error" role="alert">{error}</div>}

        <div className="form-grid">
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            placeholder="Branch"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as StaffRole })
            }
          >
            <option value="bm">Branch Manager</option>
            <option value="unit_manager">Unit Manager</option>
            <option value="agency_manager">Agency Manager</option>
            <option value="advisor">Advisor</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <button
          className="btn small-btn"
          onClick={() => void createStaff()}
          disabled={loading}
          style={{ marginTop: 15 }}
        >
          {loading ? "Creating..." : "Create Staff"}
        </button>
      </div>
    </MainLayout>
  );
}