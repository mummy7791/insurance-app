import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type AuditLog = {
  _id: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  action?: string;
  module?: string;
  description?: string;
  ipAddress?: string;
  createdAt?: string;
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<AuditLog[]>("/audit-logs");
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Audit logs load error:", error);
      alert("Audit logs load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  const modules = useMemo(() => {
    const unique = Array.from(
      new Set(logs.map((log) => log.module || "Unknown"))
    );
    return ["All", ...unique];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const text = `${log.userName || ""} ${log.userEmail || ""} ${
        log.role || ""
      } ${log.action || ""} ${log.module || ""} ${
        log.description || ""
      }`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (moduleFilter === "All" || (log.module || "Unknown") === moduleFilter)
      );
    });
  }, [logs, search, moduleFilter]);

  const exportExcel = () => {
    const rows = filteredLogs.map((log) => ({
      Date: log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A",
      User: log.userName || "Unknown User",
      Email: log.userEmail || "N/A",
      Role: log.role || "N/A",
      Module: log.module || "N/A",
      Action: log.action || "N/A",
      Description: log.description || "N/A",
      IP: log.ipAddress || "N/A",
    }));

    const headers = Object.keys(rows[0] || {});

    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        headers
          .map((header) => escapeCsv(row[header as keyof typeof row]))
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "audit-logs.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("SecureLife Insurance - Audit Logs", 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    autoTable(doc, {
      startY: 35,
      head: [["Date", "User", "Role", "Module", "Action", "Description"]],
      body: filteredLogs.map((log) => [
        log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A",
        log.userName || "Unknown",
        log.role || "N/A",
        log.module || "N/A",
        log.action || "N/A",
        log.description || "N/A",
      ]),
    });

    doc.save("audit-logs.pdf");
  };

  const deleteLog = async (id: string) => {
    const ok = window.confirm("Delete this audit log?");
    if (!ok) return;

    try {
      await api.delete(`/audit-logs/${id}`);
      setLogs((prev) => prev.filter((log) => log._id !== id));
    } catch (error) {
      console.error("Audit log delete error:", error);
      alert("Audit log delete failed. Only admin can delete.");
    }
  };

  return (
    <MainLayout
      title="Audit Logs"
      subtitle="Track login, user changes, role changes and admin activities"
    >
      <div className="admin-page-summary"><div><span className="eyebrow">SECURITY OPERATIONS</span><h2>Audit & activity center</h2><p>Review staff activity, authentication events and operational changes across the workspace.</p></div><div className="admin-summary-metrics"><div><span>Total</span><strong>{logs.length}</strong></div><div><span>Today</span><strong>{logs.filter((log) => log.createdAt && new Date(log.createdAt).toDateString() === new Date().toDateString()).length}</strong></div><div><span>Modules</span><strong>{new Set(logs.map((log) => log.module || "Unknown")).size}</strong></div></div></div>

      <div className="cards admin-kpi-grid">
        <div className="card">
          <h3>Total Logs</h3>
          <h1>{logs.length}</h1>
        </div>

        <div className="card">
          <h3>Today Logs</h3>
          <h1>
            {
              logs.filter(
                (log) =>
                  log.createdAt &&
                  new Date(log.createdAt).toDateString() ===
                    new Date().toDateString()
              ).length
            }
          </h1>
        </div>

        <div className="card">
          <h3>Users</h3>
          <h1>{new Set(logs.map((log) => log.userEmail || "N/A")).size}</h1>
        </div>

        <div className="card">
          <h3>Modules</h3>
          <h1>{new Set(logs.map((log) => log.module || "Unknown")).size}</h1>
        </div>
      </div>

      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">AUDIT SEARCH</span><h2>Search & filter</h2></div><span className="secure-chip">{filteredLogs.length} events</span></div>

        <div className="form-grid">
          <input
            placeholder="Search logs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            {modules.map((moduleName) => (
              <option key={moduleName} value={moduleName}>
                {moduleName}
              </option>
            ))}
          </select>

          <button className="mini-btn" onClick={loadLogs}>
            Refresh
          </button>

          <button className="mini-btn" onClick={exportExcel}>
            Export CSV
          </button>

          <button className="mini-btn" onClick={exportPDF}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="section admin-table-section">
        <div className="section-heading-row"><div><span className="eyebrow">ACTIVITY REGISTER</span><h2>Activity history</h2></div><span className="secure-chip">Restricted access</span></div>

        {loading ? (
          <p>Loading audit logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p>No audit logs found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log._id}>
                  <td>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "N/A"}
                  </td>
                  <td>
                    <strong>{log.userName || "Unknown User"}</strong>
                    <br />
                    <small>{log.userEmail || "N/A"}</small>
                  </td>
                  <td>{log.role || "N/A"}</td>
                  <td>{log.module || "N/A"}</td>
                  <td>
                    <span className="badge">{log.action || "N/A"}</span>
                  </td>
                  <td>{log.description || "N/A"}</td>
                  <td>{log.ipAddress || "N/A"}</td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteLog(log._id)}
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