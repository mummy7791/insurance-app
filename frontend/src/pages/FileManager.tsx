import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type FileCategory = "All" | "Customer" | "Policy" | "Claim" | "KYC" | "Receipt" | "Other";

type FileItem = {
  _id: string;
  title: string;
  category: Exclude<FileCategory, "All">;
  fileName: string;
  originalName?: string;
  filePath: string;
  mimeType?: string;
  size?: number;
  linkedId?: string;
  createdAt?: string;
};

const API_BASE_URL = "http://localhost:5000";

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Exclude<FileCategory, "All">>("Other");
  const [linkedId, setLinkedId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<FileCategory>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get<FileItem[]>("/file-manager", {
        params: {
          category: filter,
          search,
        },
      });

      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("File load error:", error);
      alert("Files load failed");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFiles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFiles]);

  const uploadFile = async () => {
    if (!selectedFile) {
      alert("Please select file");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title || selectedFile.name);
      formData.append("category", category);
      formData.append("linkedId", linkedId);

      const res = await api.post<FileItem>("/file-manager/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setFiles((prev) => [res.data, ...prev]);
      setTitle("");
      setLinkedId("");
      setSelectedFile(null);

      const input = document.getElementById("file-manager-input") as HTMLInputElement | null;
      if (input) input.value = "";

      alert("File uploaded successfully");
    } catch (error) {
      console.error("File upload error:", error);
      alert("File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!window.confirm("Delete this file?")) return;

    try {
      await api.delete(`/file-manager/${id}`);
      setFiles((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("File delete error:", error);
      alert("Delete failed. Only admin/BM can delete.");
    }
  };

  const stats = useMemo(() => {
    return {
      total: files.length,
      customer: files.filter((f) => f.category === "Customer").length,
      policy: files.filter((f) => f.category === "Policy").length,
      kyc: files.filter((f) => f.category === "KYC").length,
    };
  }, [files]);

  return (
    <MainLayout title="File Manager" subtitle="Upload, view and manage CRM documents">
      <div className="cards">
        <div className="card">
          <h3>Total Files</h3>
          <h1>{stats.total}</h1>
        </div>

        <div className="card">
          <h3>Customer Files</h3>
          <h1>{stats.customer}</h1>
        </div>

        <div className="card">
          <h3>Policy Files</h3>
          <h1>{stats.policy}</h1>
        </div>

        <div className="card">
          <h3>KYC Files</h3>
          <h1>{stats.kyc}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Upload File</h2>

        <div className="form-grid">
          <input
            placeholder="File title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as Exclude<FileCategory, "All">)
            }
          >
            <option value="Customer">Customer</option>
            <option value="Policy">Policy</option>
            <option value="Claim">Claim</option>
            <option value="KYC">KYC</option>
            <option value="Receipt">Receipt</option>
            <option value="Other">Other</option>
          </select>

          <input
            placeholder="Linked ID optional"
            value={linkedId}
            onChange={(e) => setLinkedId(e.target.value)}
          />

          <input
            id="file-manager-input"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />

          <button
            className="btn small-btn"
            onClick={() => void uploadFile()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>

        {selectedFile && (
          <p style={{ marginTop: 10 }}>
            Selected: <strong>{selectedFile.name}</strong>
          </p>
        )}
      </div>

      <div className="section">
        <h2>Search & Filter</h2>

        <div className="form-grid">
          <input
            placeholder="Search title, file name, category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FileCategory)}
          >
            <option value="All">All</option>
            <option value="Customer">Customer</option>
            <option value="Policy">Policy</option>
            <option value="Claim">Claim</option>
            <option value="KYC">KYC</option>
            <option value="Receipt">Receipt</option>
            <option value="Other">Other</option>
          </select>

          <button className="mini-btn" onClick={() => void loadFiles()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Uploaded Files</h2>

        {loading ? (
          <p>Loading files...</p>
        ) : files.length === 0 ? (
          <p>No files found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>File</th>
                <th>Size</th>
                <th>Linked ID</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {files.map((file) => (
                <tr key={file._id}>
                  <td>{file.title}</td>
                  <td>
                    <span className="badge">{file.category}</span>
                  </td>
                  <td>
                    <a
                      href={`${API_BASE_URL}${file.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {file.originalName || file.fileName}
                    </a>
                  </td>
                  <td>{Math.round((file.size || 0) / 1024)} KB</td>
                  <td>{file.linkedId || "N/A"}</td>
                  <td>
                    {file.createdAt
                      ? new Date(file.createdAt).toLocaleString()
                      : "N/A"}
                  </td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => void deleteFile(file._id)}
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