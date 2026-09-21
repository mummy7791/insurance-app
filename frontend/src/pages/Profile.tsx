import { useMemo } from "react";
import MainLayout from "../layouts/MainLayout";

type User = { id?: string; name?: string; role?: string; email?: string; branch?: string; phone?: string; advisorCode?: string; address?: string; };

export default function Profile() {
  const user: User = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("insuranceUser") || "{}") as User; }
    catch { return {}; }
  }, []);

  return (
    <MainLayout title="My Profile" subtitle="Your SecureLife staff account and access details">
      <div className="admin-page-summary">
        <div><span className="eyebrow">STAFF IDENTITY</span><h2>{user.name || "SecureLife Staff"}</h2><p>Your signed-in identity is managed by the secure staff account. Login email and password are not changed from this page.</p></div>
        <span className="secure-chip">Active session</span>
      </div>
      <div className="cards admin-kpi-grid">
        <div className="card"><h3>Name</h3><h1>{user.name || "N/A"}</h1></div>
        <div className="card"><h3>Role</h3><h1>{user.role || "N/A"}</h1></div>
        <div className="card"><h3>Advisor Code</h3><h1>{user.advisorCode || "N/A"}</h1></div>
        <div className="card"><h3>Status</h3><h1>Active</h1></div>
      </div>
      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>Staff profile</h2></div><span className="secure-chip">Read only</span></div>
        <div className="profile-detail-grid">
          <div><span>Full name</span><strong>{user.name || "N/A"}</strong></div>
          <div><span>Email address</span><strong>{user.email || "N/A"}</strong></div>
          <div><span>Role</span><strong>{user.role || "N/A"}</strong></div>
          <div><span>Phone</span><strong>{user.phone || "N/A"}</strong></div>
          <div><span>Advisor code</span><strong>{user.advisorCode || "N/A"}</strong></div>
          <div><span>Address</span><strong>{user.address || "N/A"}</strong></div>
        </div>
        <p className="section-copy">For security, credential or access changes must be completed through authorized admin account management.</p>
      </div>
    </MainLayout>
  );
}