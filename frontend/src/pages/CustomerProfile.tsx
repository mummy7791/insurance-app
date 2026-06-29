import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

type CustomerProfileData = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  kycStatus?: string;
  photo?: string;
};

const API_BASE = "http://localhost:5000";

export default function CustomerProfile() {
  const [profile, setProfile] = useState<CustomerProfileData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<CustomerProfileData>("/customer-profile");
      setProfile(res.data || {});
    } catch (error) {
      console.error("Profile load error:", error);
      alert("Profile load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  const updateProfile = async () => {
    try {
      setSaving(true);

      const res = await api.put<CustomerProfileData>("/customer-profile", {
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });

      setProfile(res.data);
      alert("Profile updated");
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async () => {
    if (!photo) {
      alert("Please select photo");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("photo", photo);

      const res = await api.post<CustomerProfileData>(
        "/customer-profile/photo",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setProfile(res.data);
      setPhoto(null);
      alert("Photo uploaded");
    } catch (error) {
      console.error("Photo upload error:", error);
      alert("Photo upload failed");
    }
  };

  const changePassword = async () => {
    if (!newPassword) {
      alert("New password required");
      return;
    }

    try {
      await api.put("/customer-profile/password", {
        oldPassword,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      alert("Password updated");
    } catch (error) {
      console.error("Password update error:", error);
      alert("Password update failed");
    }
  };

  return (
    <MainLayout
      title="Customer Profile"
      subtitle="View and update customer profile details"
    >
      {loading && <p>Loading profile...</p>}

      <div className="cards">
        <div className="card">
          <h3>Profile</h3>
          {profile.photo ? (
            <img
              src={`${API_BASE}${profile.photo}`}
              alt="Profile"
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <h1>👤</h1>
          )}
          <p>{profile.name || "N/A"}</p>
        </div>

        <div className="card">
          <h3>Email</h3>
          <h1>{profile.email || "N/A"}</h1>
        </div>

        <div className="card">
          <h3>KYC</h3>
          <h1>{profile.kycStatus || "Pending"}</h1>
        </div>
      </div>

      <div className="section">
        <h2>Edit Profile</h2>

        <div className="form-grid">
          <input
            placeholder="Name"
            value={profile.name || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <input
            placeholder="Email"
            value={profile.email || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, email: e.target.value }))
            }
          />

          <input
            placeholder="Phone"
            value={profile.phone || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, phone: e.target.value }))
            }
          />

          <input
            placeholder="Address"
            value={profile.address || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, address: e.target.value }))
            }
          />
        </div>

        <button
          className="btn small-btn"
          onClick={() => void updateProfile()}
          disabled={saving}
          style={{ marginTop: 15 }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      <div className="section">
        <h2>Upload Profile Photo</h2>

        <div className="form-grid">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />

          <button className="btn small-btn" onClick={() => void uploadPhoto()}>
            Upload Photo
          </button>
        </div>
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

          <button
            className="btn small-btn"
            onClick={() => void changePassword()}
          >
            Update Password
          </button>
        </div>
      </div>

      <button className="mini-btn" onClick={() => void loadProfile()}>
        Refresh
      </button>
    </MainLayout>
  );
}