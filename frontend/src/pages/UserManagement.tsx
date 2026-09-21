import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type UserRole = "advisor";
type UserStatus = "active" | "blocked";

type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  phone?: string;
  advisorCode?: string;
  address?: string;
  createdAt?: string;
};

type UserForm = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  advisorCode: string;
  address: string;
  password: string;
};

const initialForm: UserForm = {
  name: "",
  email: "",
  role: "advisor",
  status: "active",
  phone: "",
  advisorCode: "",
  address: "",
  password: "",
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<UserForm>(initialForm);

  const loadUsers = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<UserItem[]>("/user-management");

      setTimeout(() => {
        setUsers(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Users load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Users load failed. Only admin can access.");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const createUser = async () => {
    if (!form.name || !form.email || !form.phone || !form.advisorCode || !form.password) {
      alert("Name, Email, Phone, Advisor Code and Password required");
      return;
    }

    try {
      setCreating(true);

      const res = await api.post<UserItem>("/user-management", {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
        phone: form.phone,
        advisorCode: form.advisorCode,
        address: form.address,
        password: form.password,
      });

      setUsers((prev) => [res.data, ...prev]);
      setForm(initialForm);
      alert("User created successfully");
    } catch (error) {
      console.error("User create error:", error);
      alert("User create failed / email already exists");
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: UserStatus) => {
    try {
      const res = await api.put<UserItem>(`/user-management/${id}/status`, {
        status,
      });

      setUsers((prev) =>
        prev.map((user) => (user._id === id ? res.data : user))
      );
    } catch (error) {
      console.error("Status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteUser = async (id: string) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;

    try {
      await api.delete(`/user-management/${id}`);
      setUsers((prev) => prev.filter((user) => user._id !== id));
    } catch (error) {
      console.error("User delete error:", error);
      alert("User delete failed");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.role !== "advisor") return false;
      const text = `${user.name} ${user.email} ${user.role}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [users, search]);

  return (
    <MainLayout
      title="Advisor Access"
      subtitle="Admin creates advisor login access, profile and account status"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">ACCESS CONTROL</span><h2>Staff access workspace</h2><p>Create advisor accounts with email/password login and secure email OTP access.</p></div><div className="admin-summary-metrics"><div><span>Total Advisors</span><strong>{users.filter((u) => u.role === "advisor").length}</strong></div><div><span>Active</span><strong>{users.filter((u) => u.role === "advisor" && u.status !== "blocked").length}</strong></div><div><span>Blocked</span><strong>{users.filter((u) => u.status === "blocked").length}</strong></div></div></div>

      <div className="cards admin-kpi-grid">
        <div className="card">
          <h3>Total Advisors</h3>
          <h1>{users.filter((u) => u.role === "advisor").length}</h1>
        </div>

        <div className="card">
          <h3>Active</h3>
          <h1>{users.filter((u) => u.role === "advisor" && u.status !== "blocked").length}</h1>
        </div>

        <div className="card">
          <h3>Advisor Access</h3>
          <h1>Plans + Commission</h1>
        </div>

        <div className="card">
          <h3>Blocked</h3>
          <h1>{users.filter((u) => u.status === "blocked").length}</h1>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">NEW ADVISOR ACCOUNT</span><h2>Create advisor login</h2><p className="section-copy">Advisor can access only Plans, Commission and their Profile.</p>

        <div className="form-grid">
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />

          <input value="Advisor" disabled />

          <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <input placeholder="Advisor Code" value={form.advisorCode} onChange={(e) => setForm((prev) => ({ ...prev, advisorCode: e.target.value }))} />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          <input type="password" placeholder="Temporary Password (min 8 characters)" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />

          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                status: e.target.value as UserStatus,
              }))
            }
          >
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <button className="btn small-btn" onClick={createUser} disabled={creating}>
          {creating ? "Creating..." : "Create Advisor"}
        </button>
      </div>

      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">STAFF DIRECTORY</span><h2>Search users</h2></div><button className="mini-btn" onClick={loadUsers}>Refresh</button></div>

        <div className="admin-search-bar">
          <input
            placeholder="Search name, email, role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <span>{filteredUsers.length} records</span>
        </div>
      </div>

      <div className="section admin-table-section">
        <div className="section-heading-row"><div><span className="eyebrow">ROLE MANAGEMENT</span><h2>User list</h2></div><span className="secure-chip">Admin only</span></div>

        {loading ? (
          <p>Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Code</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>{user.name || "N/A"}</td>
                  <td>{user.email}</td>

                  <td>{user.advisorCode || "—"}</td>
                  <td>{user.phone || "—"}</td>

                  <td>
                    <select
                      className="status-select"
                      value={user.status || "active"}
                      onChange={(e) =>
                        updateStatus(user._id, e.target.value as UserStatus)
                      }
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>

                  <td>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>

                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteUser(user._id)}
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