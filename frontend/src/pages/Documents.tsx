import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type VerifyStatus = "Pending" | "Verified" | "Rejected";

type DocumentItem = {
  _id: string;
  customerName: string;
  policyNumber: string;
  documentType: string;
  fileName: string;
  filePath: string;
  uploadedDate: string;
  status: VerifyStatus;
  remarks: string;
};

type DocumentForm = {
  customerName: string;
  policyNumber: string;
  documentType: string;
  remarks: string;
};

const initialForm: DocumentForm = {
  customerName: "",
  policyNumber: "",
  documentType: "Aadhaar",
  remarks: "",
};

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);

      const res = await api.get<DocumentItem[]>("/documents");

      setTimeout(() => {
        setDocuments(res.data);
        setLoading(false);
      }, 0);
    } catch (error) {
      console.error("Documents load error:", error);
      setTimeout(() => setLoading(false), 0);
      alert("Documents load failed");
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const uploadDocument = async () => {
    if (!form.customerName || !form.policyNumber || !file) {
      alert("Customer Name, Policy Number, File required");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("customerName", form.customerName);
      formData.append("policyNumber", form.policyNumber);
      formData.append("documentType", form.documentType);
      formData.append("remarks", form.remarks);
      formData.append("file", file);

      const res = await api.post<DocumentItem>("/documents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setDocuments((prev) => [res.data, ...prev]);
      setForm(initialForm);
      setFile(null);

      const input = document.getElementById("documentFile") as HTMLInputElement;
      if (input) input.value = "";
    } catch (error) {
      console.error("Document upload error:", error);
      alert("Document upload failed");
    }
  };

  const updateStatus = async (id: string, status: VerifyStatus) => {
    try {
      const res = await api.put<DocumentItem>(`/documents/${id}`, {
        status,
      });

      setDocuments((prev) =>
        prev.map((doc) => (doc._id === id ? res.data : doc))
      );
    } catch (error) {
      console.error("Document status update error:", error);
      alert("Status update failed");
    }
  };

  const deleteDocument = async (id: string) => {
    const ok = window.confirm("Delete this document?");
    if (!ok) return;

    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc._id !== id));
    } catch (error) {
      console.error("Document delete error:", error);
      alert("Document delete failed");
    }
  };

  const getFileUrl = (filePath: string) => {
    return `http://localhost:5000${filePath}`;
  };

  return (
    <MainLayout
      title="Document / KYC Management"
      subtitle="Upload and verify Aadhaar, PAN, Bank, Income and Policy documents"
    >
      <div className="cards">
        <div className="card">
          <h3>Total Documents</h3>
          <h1>{documents.length}</h1>
        </div>

        <div className="card">
          <h3>Pending</h3>
          <h1>{documents.filter((d) => d.status === "Pending").length}</h1>
        </div>

        <div className="card">
          <h3>Verified</h3>
          <h1>{documents.filter((d) => d.status === "Verified").length}</h1>
        </div>

        <div className="card">
          <h3>Rejected</h3>
          <h1>{documents.filter((d) => d.status === "Rejected").length}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Upload Document</h2>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            value={form.customerName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                customerName: e.target.value,
              }))
            }
          />

          <input
            placeholder="Policy Number"
            value={form.policyNumber}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                policyNumber: e.target.value,
              }))
            }
          />

          <select
            value={form.documentType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                documentType: e.target.value,
              }))
            }
          >
            <option value="Aadhaar">Aadhaar</option>
            <option value="PAN">PAN</option>
            <option value="Customer Photo">Customer Photo</option>
            <option value="Bank Passbook">Bank Passbook</option>
            <option value="Cancelled Cheque">Cancelled Cheque</option>
            <option value="Income Proof">Income Proof</option>
            <option value="Address Proof">Address Proof</option>
            <option value="Policy Document">Policy Document</option>
          </select>

          <input
            id="documentFile"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <input
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, remarks: e.target.value }))
            }
          />
        </div>

        <button className="btn small-btn" onClick={uploadDocument}>
          Upload
        </button>
      </div>

      <div className="section">
        <h2>Document List</h2>

        <button className="mini-btn" onClick={loadDocuments}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy No</th>
                <th>Document</th>
                <th>File</th>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.customerName}</td>
                  <td>{doc.policyNumber}</td>
                  <td>{doc.documentType}</td>
                  <td>
                    <a
                      href={getFileUrl(doc.filePath)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {doc.fileName}
                    </a>
                  </td>
                  <td>{doc.uploadedDate}</td>
                  <td>
                    <select
                      className="status-select"
                      value={doc.status}
                      onChange={(e) =>
                        updateStatus(doc._id, e.target.value as VerifyStatus)
                      }
                    >
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td>{doc.remarks}</td>
                  <td>
                    <button
                      className="mini-btn danger-btn"
                      onClick={() => deleteDocument(doc._id)}
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