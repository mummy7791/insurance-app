import { useMemo, useState } from "react";
import api from "../services/api";
import MainLayout from "../layouts/MainLayout";

type User = { id?: string; name?: string; role?: string; email?: string; branch?: string; phone?: string; advisorCode?: string; address?: string; };

export default function Profile() {
  const user: User = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("insuranceUser") || "{}") as User; }
    catch { return {}; }
  }, []);

  const [currentPassword,setCurrentPassword]=useState(""); const [newPassword,setNewPassword]=useState(""); const [confirmPassword,setConfirmPassword]=useState(""); const [changing,setChanging]=useState(false);
  const changePassword=async()=>{if(newPassword!==confirmPassword)return alert("New passwords do not match");try{setChanging(true);await api.post("/auth/change-password",{currentPassword,newPassword});setCurrentPassword("");setNewPassword("");setConfirmPassword("");alert("Password changed successfully");}catch(e){console.error(e);alert("Password change failed. Check current password and password rules.");}finally{setChanging(false);}};

  return (
    <MainLayout title={user.role === "advisor" ? "Advisor Profile" : "My Profile"} subtitle={user.role === "advisor" ? "Your advisor identity, contact details and account security" : "Your SecureLife staff account and access details"}>
      <div className="admin-page-summary">
        <div><span className="eyebrow">{user.role === "advisor" ? "ADVISOR IDENTITY" : "STAFF IDENTITY"}</span><h2>{user.name || "SecureLife Staff"}</h2><p>{user.role === "advisor" ? "Your verified advisor account details. Keep your contact information and login credentials secure." : "Your signed-in identity is managed by the secure staff account."}</p></div>
        <span className="secure-chip">Active session</span>
      </div>
      <div className="cards admin-kpi-grid">
        <div className="card"><h3>Name</h3><h1>{user.name || "N/A"}</h1></div>
        <div className="card"><h3>Role</h3><h1>{user.role || "N/A"}</h1></div>
        <div className="card"><h3>Advisor Code</h3><h1>{user.advisorCode || "N/A"}</h1></div>
        <div className="card"><h3>Status</h3><h1>Active</h1></div>
      </div>
      <div className="section">
        <div className="section-heading-row"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>{user.role === "advisor" ? "Advisor information" : "Staff profile"}</h2></div><span className="secure-chip">Read only</span></div>
        <div className="profile-detail-grid">
          <div><span>Full name</span><strong>{user.name || "N/A"}</strong></div>
          <div><span>Email address</span><strong>{user.email || "N/A"}</strong></div>
          <div><span>Role</span><strong>{user.role || "N/A"}</strong></div>
          <div><span>Phone</span><strong>{user.phone || "N/A"}</strong></div>
          <div><span>Advisor code</span><strong>{user.advisorCode || "N/A"}</strong></div>
          <div><span>Address</span><strong>{user.address || "N/A"}</strong></div>
        </div>
        {user.role === "advisor" ? <div style={{marginTop:24}}><span className="eyebrow">SECURITY</span><h2>Change password</h2><div className="form-grid"><input type="password" placeholder="Current Password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><input type="password" placeholder="New Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div><button className="btn small-btn" disabled={changing||!currentPassword||!newPassword||!confirmPassword} onClick={changePassword}>{changing?"Changing...":"Change Password"}</button></div> : <p className="section-copy">For security, credential changes are managed through authorized account management.</p>}
      </div>
    </MainLayout>
  );
}