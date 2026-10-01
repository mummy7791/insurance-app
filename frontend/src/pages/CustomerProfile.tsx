import { useCallback, useEffect, useRef, useState } from "react";
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


export default function CustomerProfile() {
  const [profile, setProfile] = useState<CustomerProfileData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type:"success"|"error";text:string}|null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const photoUrlRef = useRef("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadProfilePhoto = useCallback(async () => {
    try {
      const res = await api.get<Blob>("/customer-profile/photo", {
        responseType: "blob",
      });

      const nextUrl = URL.createObjectURL(res.data);

      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
      }

      photoUrlRef.current = nextUrl;
      setPhotoUrl(nextUrl);
    } catch (error: unknown) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (status !== 404) {
        console.error("Profile photo load error:", error);
      }

      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
        photoUrlRef.current = "";
      }

      setPhotoUrl("");
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<CustomerProfileData>("/customer-profile");
      const nextProfile = res.data || {};
      setProfile(nextProfile);

      if (nextProfile.photo) {
        await loadProfilePhoto();
      } else {
        if (photoUrlRef.current) {
          URL.revokeObjectURL(photoUrlRef.current);
          photoUrlRef.current = "";
        }
        setPhotoUrl("");
      }
    } catch (error) {
      console.error("Profile load error:", error);
      setMessage({type:"error",text:"Profile could not be loaded. Please try again."});
    } finally {
      setLoading(false);
    }
  }, [loadProfilePhoto]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
        photoUrlRef.current = "";
      }
    };
  }, []);

  const updateProfile = async () => {
    setMessage(null);
    try {
      setSaving(true);

      const res = await api.put<CustomerProfileData>("/customer-profile", {
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });

      setProfile(res.data);
      setMessage({type:"success",text:"Profile updated successfully."});
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage({type:"error",text:"Profile update failed. Please try again."});
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async () => {
    setMessage(null);
    if (!photo) {
      setMessage({type:"error",text:"Please select a profile photo first."});
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
      await loadProfilePhoto();
      setMessage({type:"success",text:"Profile photo uploaded successfully."});
    } catch (error) {
      console.error("Photo upload error:", error);
      setMessage({type:"error",text:"Profile photo upload failed."});
    }
  };

  const changePassword = async () => {
    setMessage(null);
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      setMessage({type:"error",text:"New password must be at least 8 characters and include a letter and number."});
      return;
    }

    try {
      await api.put("/customer-profile/password", {
        oldPassword,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      setMessage({type:"success",text:"Password updated successfully."});
    } catch (error) {
      console.error("Password update error:", error);
      setMessage({type:"error",text:"Password update failed. Check your current password and try again."});
    }
  };

  return (
    <MainLayout
      title="Customer Profile"
      subtitle="Manage your personal details, KYC identity and account security"
    >
      {loading && <div className="profile-status-banner">Loading profile...</div>}
      {message && <div className={message.type === "success" ? "admin-success-state" : "checkout-inline-error"} role="status">{message.text}</div>}

      <div className="profile-hero"><div className="profile-avatar-large">{profile.photo && photoUrl ? <img src={photoUrl} alt="" /> : <span>👤</span>}</div><div><span className="eyebrow">POLICYHOLDER ACCOUNT</span><h2>{profile.name || "Customer"}</h2><p>{profile.email || "Verified customer account"}</p></div><span className="secure-chip">✓ Secure account</span></div>

      <div className="cards">
        <div className="card">
          <h3>Profile</h3>
          {profile.photo && photoUrl ? (
            <img
              src={photoUrl}
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

          <input placeholder="Email (verified)" value={profile.email || ""} readOnly aria-readonly="true" title="Verified email cannot be changed here" />

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
        <span className="eyebrow">ACCOUNT SECURITY</span><h2>Change Password</h2><p className="section-copy">Use a strong password with at least 8 characters, including a letter and number.</p>

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