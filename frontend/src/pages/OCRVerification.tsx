import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type DocumentType =
  | "Aadhaar"
  | "PAN"
  | "Driving License"
  | "Passport"
  | "Other";

type Status = "Pending" | "Verified" | "Failed";

type OCRDocument = {
  _id: string;
  documentType: DocumentType;
  fileName?: string;
  filePath?: string;
  extractedText?: string;
  extractedData?: {
    name?: string;
    dob?: string;
    documentNumber?: string;
    address?: string;
  };
  status: Status;
  createdAt?: string;
};

const API_BASE_URL = "http://localhost:5000";

export default function OCRVerification() {
  const [documentType, setDocumentType] = useState<DocumentType>("Aadhaar");
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<OCRDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = useCallback(async (): Promise<OCRDocument[]> => {
    const res = await api.get<OCRDocument[]>("/ocr/history");
    return Array.isArray(res.data) ? res.data : [];
  }, []);

  const loadDocs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDocs();
      setDocs(data);
    } catch (error) {
      console.error("OCR history error:", error);
      alert("OCR history load failed");
    } finally {
      setLoading(false);
    }
  }, [fetchDocs]);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);

      void fetchDocs()
        .then((data) => {
          if (active) {
            setDocs(data);
          }
        })
        .catch((error) => {
          console.error("OCR history error:", error);
          alert("OCR history load failed");
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [fetchDocs]);

  const uploadDocument = async () => {
    if (!file) {
      alert("Please select document file");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("document", file);
      formData.append("documentType", documentType);

      const res = await api.post<OCRDocument>("/ocr/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setDocs((prev) => [res.data, ...prev]);
      setFile(null);

      const fileInput = document.getElementById(
        "ocr-file-input"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      alert("Document uploaded successfully");
    } catch (error) {
      console.error("OCR upload error:", error);
      alert("OCR upload failed");
    } finally {
      setUploading(false);
    }
  };

  const verifyDoc = async (id: string) => {
    try {
      const res = await api.put<OCRDocument>(`/ocr/${id}/verify`);

      setDocs((prev) =>
        prev.map((doc) => (doc._id === id ? res.data : doc))
      );
    } catch (error) {
      console.error("OCR verify error:", error);
      alert("Verify failed");
    }
  };

  const deleteDoc = async (id: string) => {
    if (!window.confirm("Delete this document?")) return;

    try {
      await api.delete(`/ocr/${id}`);

      setDocs((prev) => prev.filter((doc) => doc._id !== id));
    } catch (error) {
      console.error("OCR delete error:", error);
      alert("Delete failed");
    }
  };

  const stats = useMemo(() => {
    return {
      total: docs.length,
      verified: docs.filter((doc) => doc.status === "Verified").length,
      pending: docs.filter((doc) => doc.status === "Pending").length,
      failed: docs.filter((doc) => doc.status === "Failed").length,
    };
  }, [docs]);

  return (
    <MainLayout
      title="OCR Document Verification"
      subtitle="Upload Aadhaar, PAN, Driving License or Passport for KYC verification"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Documents</h3>
          <h1>{stats.total}</h1>
        </div>

        <div className="card">
          <h3>Verified</h3>
          <h1>{stats.verified}</h1>
        </div>

        <div className="card">
          <h3>Pending</h3>
          <h1>{stats.pending}</h1>
        </div>

        <div className="card">
          <h3>Failed</h3>
          <h1>{stats.failed}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Upload Document</h2>

        <div className="form-grid">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          >
            <option value="Aadhaar">Aadhaar</option>
            <option value="PAN">PAN</option>
            <option value="Driving License">Driving License</option>
            <option value="Passport">Passport</option>
            <option value="Other">Other</option>
          </select>

          <input
            id="ocr-file-input"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            className="btn small-btn"
            onClick={() => void uploadDocument()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>

        {file && (
          <p style={{ marginTop: 10 }}>
            Selected file: <strong>{file.name}</strong>
          </p>
        )}
      </div>

      <div className="section">
        <h2>OCR History</h2>

        <button
          className="mini-btn"
          onClick={() => void loadDocs()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>

        {loading ? (
          <p>Loading documents...</p>
        ) : docs.length === 0 ? (
          <p>No OCR documents found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>File</th>
                <th>Document No</th>
                <th>Name</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {docs.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.documentType}</td>

                  <td>
                    {doc.filePath ? (
                      <a
                        href={`${API_BASE_URL}${doc.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View File
                      </a>
                    ) : (
                      doc.fileName || "N/A"
                    )}
                  </td>

                  <td>{doc.extractedData?.documentNumber || "N/A"}</td>
                  <td>{doc.extractedData?.name || "N/A"}</td>

                  <td>
                    <span
                      className={
                        doc.status === "Verified"
                          ? "badge success-badge"
                          : doc.status === "Failed"
                          ? "badge danger-badge"
                          : "badge warning-badge"
                      }
                    >
                      {doc.status}
                    </span>
                  </td>

                  <td>
                    {doc.createdAt
                      ? new Date(doc.createdAt).toLocaleString()
                      : "N/A"}
                  </td>

                  <td>
                    {doc.status !== "Verified" && (
                      <button
                        className="mini-btn"
                        onClick={() => void verifyDoc(doc._id)}
                      >
                        Verify
                      </button>
                    )}

                    <button
                      className="mini-btn danger-btn"
                      onClick={() => void deleteDoc(doc._id)}
                      style={{ marginLeft: 5 }}
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