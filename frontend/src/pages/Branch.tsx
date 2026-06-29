import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type BranchStatus = "Active" | "Blocked";

type Branch = {
  _id: string;
  branchName: string;
  branchCode: string;
  city: string;
  address: string;
  bmName: string;
  phone?: string;
  email?: string;
  target: number;
  achievement: number;
  status: BranchStatus;
};

type BranchForm = {
  branchName: string;
  branchCode: string;
  city: string;
  address: string;
  bmName: string;
  phone: string;
  email: string;
  target: string;
  achievement: string;
};

const initialForm: BranchForm = {
  branchName: "",
  branchCode: "",
  city: "",
  address: "",
  bmName: "",
  phone: "",
  email: "",
  target: "",
  achievement: "",
};

export default function Branch() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadBranches = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<Branch[]>("/branches");

      setTimeout(() => {
        setBranches(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Branches load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Branches load failed");
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const addBranch = async () => {
    if (!form.branchName || !form.branchCode || !form.city || !form.bmName) {
      alert("Branch Name, Code, City, BM Name required");
      return;
    }

    try {
      const res = await api.post<Branch>("/branches", {
        branchName: form.branchName,
        branchCode: form.branchCode,
        city: form.city,
        address: form.address || "N/A",
        bmName: form.bmName,
        phone: form.phone,
        email: form.email,
        target: Number(form.target || 0),
        achievement: Number(form.achievement || 0),
      });

      setBranches((prev) => [res.data, ...prev]);
      setForm(initialForm);
    } catch (error) {
      console.error("Branch add error:", error);
      alert("Branch add failed");
    }
  };

  const updateStatus = async (id: string, status: BranchStatus) => {
    try {
      const res = await api.put<Branch>(`/branches/${id}`, {
        status,
      });

      setBranches((prev) =>
        prev.map((branch) => (branch._id === id ? res.data : branch))
      );
    } catch (error) {
      console.error("Branch status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteBranch = async (id: string) => {
    const ok = window.confirm("Delete this branch?");
    if (!ok) return;

    try {
      await api.delete(`/branches/${id}`);
      setBranches((prev) => prev.filter((branch) => branch._id !== id));
    } catch (error) {
      console.error("Branch delete error:", error);
      alert("Branch delete failed. Only admin can delete branches.");
    }
  };

  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const text = `${branch.branchName} ${branch.branchCode} ${branch.city} ${branch.bmName} ${branch.phone || ""} ${branch.email || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [branches, search]);

  const totalTarget = branches.reduce((sum, branch) => sum + branch.target, 0);
  const totalAchievement = branches.reduce(
    (sum, branch) => sum + branch.achievement,
    0
  );

  return (
    <MainLayout
      title="Branch Management"
      subtitle="Create branches, assign BM and track branch targets"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Branches</h3>
          <h1>{branches.length}</h1>
        </div>

        <div className="card">
          <h3>Active Branches</h3>
          <h1>{branches.filter((branch) => branch.status === "Active").length}</h1>
        </div>

        <div className="card">
          <h3>Total Target</h3>
          <h1>₹{totalTarget}</h1>
        </div>

        <div className="card">
          <h3>Total Achievement</h3>
          <h1>₹{totalAchievement}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Add Branch</h2>

        <div className="form-grid">
          <input
            placeholder="Branch Name"
            value={form.branchName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, branchName: e.target.value }))
            }
          />

          <input
            placeholder="Branch Code"
            value={form.branchCode}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, branchCode: e.target.value }))
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
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
          />

          <input
            placeholder="Branch Manager Name"
            value={form.bmName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, bmName: e.target.value }))
            }
          />

          <input
            placeholder="Phone"
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
              setForm((prev) => ({
                ...prev,
                achievement: e.target.value,
              }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={addBranch}>
          Add Branch
        </button>
      </div>

      <div className="section">
        <h2>Branch List</h2>

        <button className="mini-btn" onClick={loadBranches}>
          Refresh
        </button>

        <div className="form-grid">
          <input
            placeholder="Search branch, code, city, BM"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredBranches.length === 0 ? (
          <p>No branches found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Code</th>
                <th>City</th>
                <th>BM</th>
                <th>Phone</th>
                <th>Target</th>
                <th>Achievement</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBranches.map((branch) => (
                <tr key={branch._id}>
                  <td>
                    <strong>{branch.branchName}</strong>
                    <br />
                    {branch.address}
                  </td>

                  <td>{branch.branchCode}</td>
                  <td>{branch.city}</td>

                  <td>
                    {branch.bmName}
                    <br />
                    {branch.email || "N/A"}
                  </td>

                  <td>{branch.phone || "N/A"}</td>
                  <td>₹{branch.target}</td>
                  <td>₹{branch.achievement}</td>

                  <td>
                    <span className="badge">{branch.status}</span>
                  </td>

                  <td>
                    <button
                      className="mini-btn"
                      onClick={() =>
                        updateStatus(
                          branch._id,
                          branch.status === "Active" ? "Blocked" : "Active"
                        )
                      }
                    >
                      {branch.status === "Active" ? "Block" : "Activate"}
                    </button>

                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteBranch(branch._id)}
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