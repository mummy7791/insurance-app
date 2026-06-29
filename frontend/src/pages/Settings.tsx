import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type ThemeType = "light" | "dark";

type Setting = {
  _id?: string;
  companyName: string;
  logoText: string;
  supportPhone: string;
  supportEmail: string;
  defaultCommissionRate: number;
  theme: ThemeType;
  currency: string;
};

type SettingForm = {
  companyName: string;
  logoText: string;
  supportPhone: string;
  supportEmail: string;
  defaultCommissionRate: string;
  theme: ThemeType;
  currency: string;
};

const initialForm: SettingForm = {
  companyName: "LifeSecure CRM",
  logoText: "🛡️ LifeSecure CRM",
  supportPhone: "9999999999",
  supportEmail: "support@lifesecure.com",
  defaultCommissionRate: "10",
  theme: "light",
  currency: "INR",
};

export default function Settings() {
  const [form, setForm] = useState<SettingForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Setting>("/settings");

      setTimeout(() => {
        setForm({
          companyName: res.data.companyName || "",
          logoText: res.data.logoText || "",
          supportPhone: res.data.supportPhone || "",
          supportEmail: res.data.supportEmail || "",
          defaultCommissionRate: String(res.data.defaultCommissionRate || 0),
          theme: res.data.theme || "light",
          currency: res.data.currency || "INR",
        });

        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Settings load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Settings load failed");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadSettings]);

  const saveSettings = async () => {
    if (!form.companyName || !form.logoText) {
      alert("Company Name and Logo Text required");
      return;
    }

    try {
      setSaving(true);

      await api.put<Setting>("/settings", {
        companyName: form.companyName,
        logoText: form.logoText,
        supportPhone: form.supportPhone,
        supportEmail: form.supportEmail,
        defaultCommissionRate: Number(form.defaultCommissionRate || 0),
        theme: form.theme,
        currency: form.currency,
      });

      alert("Settings saved successfully");
    } catch (error) {
      console.error("Settings save error:", error);
      alert("Settings save failed. Only admin can update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout
      title="Settings"
      subtitle="Manage company profile, support details, commission and theme"
    >
      <div className="cards">
        <div className="card">
          <h3>Company</h3>
          <h1>{form.companyName || "N/A"}</h1>
        </div>

        <div className="card">
          <h3>Currency</h3>
          <h1>{form.currency}</h1>
        </div>

        <div className="card">
          <h3>Commission</h3>
          <h1>{form.defaultCommissionRate}%</h1>
        </div>

        <div className="card">
          <h3>Theme</h3>
          <h1>{form.theme}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Company Settings</h2>

        {loading ? (
          <p>Loading settings...</p>
        ) : (
          <>
            <div className="form-grid">
              <input
                placeholder="Company Name"
                value={form.companyName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    companyName: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Logo Text"
                value={form.logoText}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    logoText: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Support Phone"
                value={form.supportPhone}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    supportPhone: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Support Email"
                value={form.supportEmail}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    supportEmail: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Default Commission Rate %"
                value={form.defaultCommissionRate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultCommissionRate: e.target.value,
                  }))
                }
              />

              <select
                value={form.theme}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    theme: e.target.value as ThemeType,
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>

              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    currency: e.target.value,
                  }))
                }
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
              </select>
            </div>

            <button className="btn small-btn" onClick={saveSettings}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}