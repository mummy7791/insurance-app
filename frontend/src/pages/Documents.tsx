import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("insuranceUser") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isCustomer = user.role === "customer" || !user.role;
  const verifiedCount = documents.filter((d) => d.status === "Verified").length;
  const kycProgress = documents.length === 0 ? 0 : Math.round((verifiedCount / documents.length) * 100);

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
    if (isCustomer) {
      setForm((prev) => ({ ...prev, customerName: user.name || prev.customerName }));
    }
  }, [isCustomer, loadDocuments, user.name]);

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
      setForm(isCustomer ? { ...initialForm, customerName: user.name || "" } : initialForm);
      setFile(null);

      const input = document.getElementById("documentFile") as HTMLInputElement;
      if (input) input.value = "";
    } catch (error) {
      console.error("Document upload error:", error);
      alert("Document upload failed");
    }
  };

  const reviewDocument = async (doc: DocumentItem, status: "Verified" | "Rejected") => {
    const remarks = (reviewRemarks[doc._id] || "").trim();
    if (status === "Rejected" && !remarks) {
      alert("Please enter rejection reason first");
      return;
    }
    try {
      const res = await api.patch<DocumentItem>(`/documents/${doc._id}/review`, { status, remarks });
      setDocuments((prev) => prev.map((item) => item._id === doc._id ? res.data : item));
      setReviewRemarks((prev) => ({ ...prev, [doc._id]: "" }));
    } catch (error) {
      console.error("Document review error:", error);
      alert("KYC review update failed");
    }
  };

  const reuploadDocument = async (doc: DocumentItem, replacement: File | null) => {
    if (!replacement) return;
    try {
      const data = new FormData();
      data.append("file", replacement);
      const res = await api.post<DocumentItem>(`/documents/${doc._id}/reupload`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocuments((prev) => prev.map((item) => item._id === doc._id ? res.data : item));
      alert("Document re-uploaded. Verification is pending.");
    } catch (error) {
      console.error("Document re-upload error:", error);
      alert("Document re-upload failed");
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

  const viewDocument = async (doc: DocumentItem) => {
    try {
      const res = await api.get(`/documents/${doc._id}/file`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Document view error:", error);
      alert("Document access failed");
    }
  };

  return (
    <MainLayout
      title={isCustomer ? "Documents & KYC" : "Document / KYC Management"}
      subtitle={isCustomer ? "Upload required documents and track verification status" : "Upload and verify Aadhaar, PAN, Bank, Income and Policy documents"}
    >
      {isCustomer && <div className="kyc-overview"><div><span className="eyebrow">KYC COMPLETION</span><h2>{documents.length === 0 ? "Upload your first KYC document" : `${kycProgress}% verified`}</h2><p>Your documents stay private and are available only through your authenticated account.</p></div><div className="kyc-progress-track"><span style={{width: `${kycProgress}%`}} /></div></div>}

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
        <span className="eyebrow">SECURE DOCUMENT VAULT</span><h2>Upload Document</h2><p className="section-copy">Upload KYC and policy documents securely. Verification status will appear below after review.</p>

        <div className="form-grid">
          <input
            placeholder="Customer Name"
            readOnly={isCustomer}
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
            <option value="Nominee Photo">Nominee Photo</option>
            <option value="Nominee Aadhaar">Nominee Aadhaar</option>
            <option value="Nominee PAN">Nominee PAN</option>
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

        <button className="btn small-btn" onClick={uploadDocument}>Upload securely</button>
      </div>

      <div className="section kyc-documents-section">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">KYC STATUS</span>
            <h2>My Documents</h2>
            <p className="kyc-status-note">
              KYC documents linked to an active online policy are securely stored here. <strong>Pending verification</strong> means the document is waiting for admin review.
            </p>
          </div>
          <span className="secure-chip">🔒 Private vault</span>
        </div>

        <button className="mini-btn" onClick={loadDocuments}>
          Refresh
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <div className="kyc-table-wrap"><table className="table kyc-documents-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Policy No</th>
                <th>Document</th>
                <th>File</th>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks</th>
                {!isCustomer && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.customerName}</td>
                  <td>{doc.policyNumber}</td>
                  <td>{doc.documentType}</td>
                  <td>
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => void viewDocument(doc)}
                    >
                      {doc.fileName}
                    </button>
                  </td>
                  <td>{doc.uploadedDate}</td>
                  <td><span className={`status-pill ${doc.status === "Verified" ? "active" : doc.status === "Rejected" ? "overdue" : "due"}`}>{doc.status}</span></td>
                  <td>
                    <div className="kyc-remarks">{doc.remarks || "KYC document linked to active online policy - pending verification"}</div>
                    {!isCustomer && <input className="status-select" placeholder="Review / rejection remarks" value={reviewRemarks[doc._id] || ""} onChange={(e) => setReviewRemarks((prev) => ({...prev,[doc._id]:e.target.value}))} />}
                    {isCustomer && doc.status === "Rejected" && <label className="mini-btn">Re-upload<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden onChange={(e)=>void reuploadDocument(doc,e.target.files?.[0]||null)} /></label>}
                  </td>
                  {!isCustomer && <td>
                    <button className="mini-btn" onClick={() => void reviewDocument(doc,"Verified")}>Verify</button>{" "}
                    <button className="mini-btn danger-btn" onClick={() => void reviewDocument(doc,"Rejected")}>Reject</button>{" "}
                    <button className="mini-btn danger-btn" onClick={() => deleteDocument(doc._id)}>Delete</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </MainLayout>
  );
}