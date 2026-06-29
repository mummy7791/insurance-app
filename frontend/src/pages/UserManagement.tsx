import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type UserRole = "admin" | "bm" | "unit_manager" | "agency_manager" | "agent";
type UserStatus = "active" | "blocked";

type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
};

type UserForm = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

const initialForm: UserForm = {
  name: "",
  email: "",
  role: "agent",
  status: "active",
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
    if (!form.name || !form.email || !form.role) {
      alert("Name, Email and Role required");
      return;
    }

    try {
      setCreating(true);

      const res = await api.post<UserItem>("/user-management", {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
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

  const updateRole = async (id: string, role: UserRole) => {
    try {
      const res = await api.put<UserItem>(`/user-management/${id}/role`, {
        role,
      });

      setUsers((prev) =>
        prev.map((user) => (user._id === id ? res.data : user))
      );
    } catch (error) {
      console.error("Role update error:", error);
      alert("Role update failed");
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
      const text = `${user.name} ${user.email} ${user.role}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [users, search]);

  return (
    <MainLayout
      title="User Role Management"
      subtitle="Create users and assign admin, BM, unit manager, agency manager and agent roles"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Users</h3>
          <h1>{users.length}</h1>
        </div>

        <div className="card">
          <h3>Admins</h3>
          <h1>{users.filter((u) => u.role === "admin").length}</h1>
        </div>

        <div className="card">
          <h3>Agents</h3>
          <h1>{users.filter((u) => u.role === "agent").length}</h1>
        </div>

        <div className="card">
          <h3>Blocked</h3>
          <h1>{users.filter((u) => u.status === "blocked").length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Create New User</h2>

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

          <select
            value={form.role}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                role: e.target.value as UserRole,
              }))
            }
          >
            <option value="admin">Admin</option>
            <option value="bm">Branch Manager</option>
            <option value="unit_manager">Unit Manager</option>
            <option value="agency_manager">Agency Manager</option>
            <option value="agent">Agent</option>
          </select>

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
          {creating ? "Creating..." : "Create User"}
        </button>
      </div>

      <div className="section">
        <h2>Search Users</h2>

        <div className="form-grid">
          <input
            placeholder="Search name, email, role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="mini-btn" onClick={loadUsers}>
            Refresh
          </button>
        </div>
      </div>

      <div className="section">
        <h2>User List</h2>

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
                <th>Role</th>
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

                  <td>
                    <select
                      className="status-select"
                      value={user.role}
                      onChange={(e) =>
                        updateRole(user._id, e.target.value as UserRole)
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="bm">Branch Manager</option>
                      <option value="unit_manager">Unit Manager</option>
                      <option value="agency_manager">Agency Manager</option>
                      <option value="agent">Agent</option>
                    </select>
                  </td>

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