import { useState, useRef } from "react";
import "../styles/Settings.css";

type SettingsProps = {
  initialData?: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
};

function Settings({ initialData }: SettingsProps) {
  const defaultData = {
    name: "Adam Yanuar",
    email: "adam@gmail.com",
    phone: "085**********",
    avatar: "https://i.pravatar.cc/96?img=12",
  };

  const data = initialData ?? defaultData;

  const [profileForm, setProfileForm] = useState({
    name: data.name,
    email: data.email,
    phone: data.phone,
  });
  const [avatar, setAvatar] = useState<string>(data.avatar ?? "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    newPass: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Avatar upload ─── */
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  /* ─── Profile save ─── */
  function handleSaveProfile() {
    setIsEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  /* ─── Password save ─── */
  function handleSavePassword() {
    setPasswordError("");
    if (!passwordForm.current) {
      setPasswordError("Password saat ini wajib diisi.");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }
    setIsEditingPassword(false);
    setPasswordForm({ current: "", newPass: "", confirm: "" });
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  }

  function toggleShow(field: keyof typeof showPasswords) {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  return (
    <div className="settings-page">
      {/* ── Avatar + name ── */}
      <section className="settings-card settings-profile-header">
        <div className="sph-avatar-wrap">
          <img
            className="sph-avatar"
            src={avatar || "https://i.pravatar.cc/96?img=12"}
            alt="Foto profil"
          />
          <button
            className="sph-avatar-overlay"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Ganti foto profil"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sph-file-input"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="sph-meta">
          <span className="sph-name">{profileForm.name}</span>
          <span className="sph-email">{profileForm.email}</span>
          <button
            className="sph-upload-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </button>
        </div>
      </section>

      {/* ── Informasi Akun ── */}
      <section className="settings-card">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Informasi Akun</h2>
          {!isEditingProfile && (
            <button
              className="settings-btn settings-btn--outline"
              type="button"
              onClick={() => setIsEditingProfile(true)}
            >
              Edit Profil
            </button>
          )}
        </div>

        <div className="settings-form-grid">
          <div className="settings-field">
            <label className="settings-label" htmlFor="sf-name">
              Nama
            </label>
            <input
              id="sf-name"
              className="settings-input"
              type="text"
              value={profileForm.name}
              disabled={!isEditingProfile}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="sf-phone">
              No Hp
            </label>
            <input
              id="sf-phone"
              className="settings-input"
              type="tel"
              value={profileForm.phone}
              disabled={!isEditingProfile}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="sf-email">
              Email
            </label>
            <input
              id="sf-email"
              className="settings-input"
              type="email"
              value={profileForm.email}
              disabled={!isEditingProfile}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>
        </div>

        {isEditingProfile && (
          <div className="settings-actions">
            <button
              className="settings-btn settings-btn--ghost"
              type="button"
              onClick={() => {
                setIsEditingProfile(false);
                setProfileForm({
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                });
              }}
            >
              Batal
            </button>
            <button
              className="settings-btn settings-btn--primary"
              type="button"
              onClick={handleSaveProfile}
            >
              Simpan
            </button>
          </div>
        )}

        {profileSaved && (
          <p className="settings-toast settings-toast--success">
            ✓ Profil berhasil disimpan.
          </p>
        )}
      </section>

      {/* ── Keamanan ── */}
      <section className="settings-card">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Keamanan</h2>
          {!isEditingPassword && (
            <button
              className="settings-btn settings-btn--outline"
              type="button"
              onClick={() => setIsEditingPassword(true)}
            >
              Ganti Password
            </button>
          )}
        </div>

        {!isEditingPassword ? (
          <div className="settings-field" style={{ maxWidth: 320 }}>
            <label className="settings-label">Password</label>
            <input
              className="settings-input"
              type="password"
              value="••••••••••••"
              disabled
              readOnly
            />
          </div>
        ) : (
          <>
            <div className="settings-form-grid settings-form-grid--single">
              {(
                [
                  {
                    id: "sp-current",
                    field: "current" as const,
                    label: "Password Saat Ini",
                  },
                  {
                    id: "sp-new",
                    field: "newPass" as const,
                    label: "Password Baru",
                  },
                  {
                    id: "sp-confirm",
                    field: "confirm" as const,
                    label: "Konfirmasi Password Baru",
                  },
                ] as const
              ).map(({ id, field, label }) => (
                <div className="settings-field" key={id}>
                  <label className="settings-label" htmlFor={id}>
                    {label}
                  </label>
                  <div className="settings-input-wrap">
                    <input
                      id={id}
                      className="settings-input"
                      type={showPasswords[field] ? "text" : "password"}
                      value={passwordForm[field]}
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          [field]: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                    />
                    <button
                      className="settings-eye-btn"
                      type="button"
                      onClick={() => toggleShow(field)}
                      aria-label={
                        showPasswords[field]
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPasswords[field] ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {passwordError && (
              <p className="settings-toast settings-toast--error">
                ⚠ {passwordError}
              </p>
            )}

            <div className="settings-actions">
              <button
                className="settings-btn settings-btn--ghost"
                type="button"
                onClick={() => {
                  setIsEditingPassword(false);
                  setPasswordForm({ current: "", newPass: "", confirm: "" });
                  setPasswordError("");
                }}
              >
                Batal
              </button>
              <button
                className="settings-btn settings-btn--primary"
                type="button"
                onClick={handleSavePassword}
              >
                Simpan Password
              </button>
            </div>
          </>
        )}

        {passwordSaved && (
          <p className="settings-toast settings-toast--success">
            ✓ Password berhasil diubah.
          </p>
        )}
      </section>
    </div>
  );
}

export default Settings;