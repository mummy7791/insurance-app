import { useState } from "react";

type User = {
  id?: string;
  name?: string;
  role?: string;
  email?: string;
};

export default function Profile() {
  const user: User = JSON.parse(localStorage.getItem("insuranceUser") || "{}");

  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState("9999999999");
  const [branch, setBranch] = useState("Rajahmundry");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const saveProfile = () => {
    const updatedUser = {
      ...user,
      name,
      email,
    };

    localStorage.setItem("insuranceUser", JSON.stringify(updatedUser));
    alert("Profile updated successfully");
  };

  const changePassword = () => {
    if (!oldPassword || !newPassword) {
      alert("Old password and new password required");
      return;
    }

    alert("Password changed successfully");
    setOldPassword("");
    setNewPassword("");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>🛡️ LifeSecure CRM</h2>
        <a href="/dashboard">🏠 Dashboard</a>
        <a href="/profile">👤 Profile</a>
        <a href="/leads">📋 Leads</a>
        <a href="/customers">👥 Customers</a>
        <a href="/policies">📑 Policies</a>
        <a href="/premiums">💰 Premiums</a>
        <a href="/commission">💸 Commission</a>
        <a href="/employees">👨‍💼 Employees</a>
        <a href="/claims">🧾 Claims</a>
        <a href="/documents">📂 Documents</a>
        <a href="/calendar">📅 Calendar</a>
        <a href="/notifications">🔔 Notifications</a>
        <a href="/analytics">📈 Analytics</a>
        <a href="/reports">📊 Reports</a>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>My Profile</h2>
            <p>Manage account, branch and password details</p>
          </div>
        </div>

        <div className="cards">
          <div className="card">
            <h3>Name</h3>
            <h1>{name || "User"}</h1>
          </div>

          <div className="card">
            <h3>Role</h3>
            <h1>{user.role || "N/A"}</h1>
          </div>

          <div className="card">
            <h3>Branch</h3>
            <h1>{branch}</h1>
          </div>

          <div className="card">
            <h3>Status</h3>
            <h1>Active</h1>
          </div>
        </div>

        <div className="section">
          <h2>Profile Information</h2>

          <div className="form-grid">
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              placeholder="Branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          <button className="btn small-btn" onClick={saveProfile}>
            Save Profile
          </button>
        </div>

        <div className="section">
          <h2>Change Password</h2>

          <div className="form-grid">
            <input
              type="password"
              placeholder="Old Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button className="btn small-btn" onClick={changePassword}>
            Change Password
          </button>
        </div>
      </main>
    </div>
  );
}