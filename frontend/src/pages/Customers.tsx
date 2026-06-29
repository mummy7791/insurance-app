import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  occupation?: string;
  income?: number;
  leadStatus: "new" | "followup" | "converted" | "rejected";
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  occupation: string;
  income: string;
};

const initialForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  occupation: "",
  income: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CustomerForm>(initialForm);

  const loadCustomers = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Customer[]>("/customers");

      setTimeout(() => {
        setCustomers(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Customers load error:", error);

      setTimeout(() => setLoading(false), 0);
      alert("Customers load failed");
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const addCustomer = async () => {
    if (!form.name || !form.phone || !form.city) {
      alert("Name, Phone, City required");
      return;
    }

    try {
      const res = await api.post<Customer>("/customers", {
        name: form.name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        occupation: form.occupation,
        income: Number(form.income || 0),
      });

      setCustomers((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Add customer error:", error);
      alert("Customer add failed");
    }
  };

  const updateStatus = async (
    id: string,
    leadStatus: Customer["leadStatus"]
  ) => {
    try {
      const res = await api.put<Customer>(`/customers/${id}`, {
        leadStatus,
      });

      setCustomers((prev) =>
        prev.map((customer) => (customer._id === id ? res.data : customer))
      );
    } catch (error) {
      console.error("Customer status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteCustomer = async (id: string) => {
    const ok = window.confirm("Delete this customer?");
    if (!ok) return;

    try {
      await api.delete(`/customers/${id}`);

      setCustomers((prev) =>
        prev.filter((customer) => customer._id !== id)
      );
    } catch (error) {
      console.error("Customer delete error:", error);
      alert("Customer delete failed");
    }
  };

  return (
    <MainLayout
      title="Customers / Leads"
      subtitle="Add leads and manage customer follow-ups"
    >
      <div className="section">
        <h2>Add New Customer</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <input
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />

          <input
            placeholder="City"
            value={form.city}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, city: e.target.value }))
            }
          />

          <input
            placeholder="Occupation"
            value={form.occupation}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                occupation: e.target.value,
              }))
            }
          />

          <input
            placeholder="Income"
            value={form.income}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, income: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addCustomer}>
          Add Customer
        </button>
      </div>

      <div className="section">
        <h2>Customer List</h2>

        <button className="mini-btn" onClick={loadCustomers}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          <div className="lead-grid">
            {customers.map((customer) => (
              <div className="lead-card" key={customer._id}>
                <h3>{customer.name}</h3>
                <p>📞 {customer.phone}</p>
                <p>📧 {customer.email || "N/A"}</p>
                <p>📍 {customer.city || "N/A"}</p>
                <p>💼 {customer.occupation || "N/A"}</p>
                <p>💰 ₹{customer.income || 0}</p>

                <span className="badge">{customer.leadStatus}</span>

                <select
                  className="status-select"
                  value={customer.leadStatus}
                  onChange={(e) =>
                    updateStatus(
                      customer._id,
                      e.target.value as Customer["leadStatus"]
                    )
                  }
                >
                  <option value="new">New</option>
                  <option value="followup">Follow Up</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>

                <button
                  className="mini-btn danger-btn"
                  onClick={() => deleteCustomer(customer._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}