import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
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

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
    XLSX.writeFile(workbook, "audit-logs.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("LifeSecure CRM - Audit Logs", 14, 18);

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
      <div className="cards">
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
        <h2>Search & Filter</h2>

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
            Export Excel
          </button>

          <button className="mini-btn" onClick={exportPDF}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Activity History</h2>

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