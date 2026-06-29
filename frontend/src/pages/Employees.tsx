import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type Role = "Agent" | "Agency Manager" | "Unit Manager" | "BM" | "Admin";
type Status = "Active" | "Blocked";

type Employee = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  branch: string;
  manager: string;
  target: number;
  achievement: number;
  status: Status;
};

type EmployeeForm = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  branch: string;
  manager: string;
  target: string;
  achievement: string;
};

const initialForm: EmployeeForm = {
  name: "",
  email: "",
  phone: "",
  role: "Agent",
  branch: "",
  manager: "",
  target: "",
  achievement: "",
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All");

  const loadEmployees = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Employee[]>("/employees");

      setTimeout(() => {
        setEmployees(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Employees load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Employees load failed");
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const addEmployee = async () => {
    if (!form.name || !form.email || !form.phone || !form.branch) {
      alert("Name, Email, Phone, Branch required");
      return;
    }

    try {
      const res = await api.post<Employee>("/employees", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        branch: form.branch,
        manager: form.manager || "Not Assigned",
        target: Number(form.target || 0),
        achievement: Number(form.achievement || 0),
      });

      setEmployees((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Employee add error:", error);
      alert("Employee add failed");
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    try {
      const res = await api.put<Employee>(`/employees/${id}`, {
        status,
      });

      setEmployees((prev) =>
        prev.map((emp) => (emp._id === id ? res.data : emp))
      );
    } catch (error) {
      console.error("Employee status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteEmployee = async (id: string) => {
    const ok = window.confirm("Delete this employee?");
    if (!ok) return;

    try {
      await api.delete(`/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp._id !== id));
    } catch (error) {
      console.error("Employee delete error:", error);
      alert("Employee delete failed");
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const text = `${emp.name} ${emp.email} ${emp.phone} ${emp.branch} ${emp.manager}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole = roleFilter === "All" || emp.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [employees, search, roleFilter]);

  return (
    <MainLayout
      title="Employee Management"
      subtitle="Manage agents, agency managers, unit managers and BM"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Employees</h3>
          <h1>{employees.length}</h1>
        </div>

        <div className="card">
          <h3>Active</h3>
          <h1>{employees.filter((e) => e.status === "Active").length}</h1>
        </div>

        <div className="card">
          <h3>Blocked</h3>
          <h1>{employees.filter((e) => e.status === "Blocked").length}</h1>
        </div>

        <div className="card">
          <h3>Agents</h3>
          <h1>{employees.filter((e) => e.role === "Agent").length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Add Employee</h2>

        <div className="form-grid">
          <input
            placeholder="Employee Name"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
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
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, role: e.target.value as Role }))
            }
          >
            <option value="Agent">Agent</option>
            <option value="Agency Manager">Agency Manager</option>
            <option value="Unit Manager">Unit Manager</option>
            <option value="BM">BM</option>
            <option value="Admin">Admin</option>
          </select>

          <input
            placeholder="Branch"
            value={form.branch}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, branch: e.target.value }))
            }
          />

          <input
            placeholder="Reporting Manager"
            value={form.manager}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, manager: e.target.value }))
            }
          />

          <input
            placeholder="Monthly Target"
            value={form.target}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, target: e.target.value }))
            }
          />

          <input
            placeholder="Achievement"
            value={form.achievement}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, achievement: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addEmployee}>
          Add Employee
        </button>
      </div>

      <div className="section">
        <h2>Employee List</h2>

        <button className="mini-btn" onClick={loadEmployees}>
          Refresh
        </button>

        <div className="form-grid">
          <input
            placeholder="Search name, email, phone, branch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "All" | Role)}
          >
            <option value="All">All Roles</option>
            <option value="Agent">Agent</option>
            <option value="Agency Manager">Agency Manager</option>
            <option value="Unit Manager">Unit Manager</option>
            <option value="BM">BM</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredEmployees.length === 0 ? (
          <p>No employees found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Manager</th>
                <th>Target</th>
                <th>Achievement</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <strong>{emp.name}</strong>
                    <br />
                    {emp.email}
                  </td>

                  <td>{emp.role}</td>
                  <td>{emp.phone}</td>
                  <td>{emp.branch}</td>
                  <td>{emp.manager}</td>
                  <td>₹{emp.target}</td>
                  <td>₹{emp.achievement}</td>

                  <td>
                    <span className="badge">{emp.status}</span>
                  </td>

                  <td>
                    <button
                      className="mini-btn"
                      onClick={() =>
                        updateStatus(
                          emp._id,
                          emp.status === "Active" ? "Blocked" : "Active"
                        )
                      }
                    >
                      {emp.status === "Active" ? "Block" : "Activate"}
                    </button>

                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteEmployee(emp._id)}
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