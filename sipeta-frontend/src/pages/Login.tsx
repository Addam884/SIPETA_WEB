import { useState } from "react";
import "../styles/Login.css";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log({
      email,
      password,
      remember
    });

    // nanti disini bisa panggil API login
  };

  return (
    <div className="login-page">

      {/* LEFT SIDE */}
      <div className="login-left">
        <div className="login-left__bg-grid" />
        <div className="login-left__glow login-left__glow--top" />
        <div className="login-left__glow login-left__glow--bottom" />

        <div className="login-left__content">
          <div className="login-left__badge">
            <span className="login-left__badge-dot" />
            <span>Sistem Aktif</span>
          </div>

          <h1>SIPETA</h1>

          <p>
            Sistem Informasi Pemetaan Penyakit berbasis web yang membantu
            memvisualisasikan penyebaran penyakit secara geografis sehingga
            mempermudah analisis dan pengambilan keputusan.
          </p>

          <div className="login-left__stats">

            <div className="login-stat">
              <span className="login-stat__num">Real-time</span>
              <span className="login-stat__label">Pembaruan Data</span>
            </div>

            <div className="login-stat__divider" />

            <div className="login-stat">
              <span className="login-stat__num">GIS</span>
              <span className="login-stat__label">Berbasis Peta</span>
            </div>

            <div className="login-stat__divider" />

            <div className="login-stat">
              <span className="login-stat__num">Analitik</span>
              <span className="login-stat__label">Visual Interaktif</span>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">
        <div className="login-right__glow" />

        <div className="login-card">

          <div className="login-header">
            <h2>Masuk ke SIPETA</h2>
            <p>Masuk ke dashboard SIPETA</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>

            {/* EMAIL */}
            <div className="form-group">
              <label>Email</label>

              <div className="form-group__input-wrap">

                <svg className="form-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>

                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

              </div>
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label>Password</label>

              <div className="form-group__input-wrap">

                <svg className="form-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>

                <input
                  type="password"
                  placeholder="Masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

              </div>
            </div>

            {/* REMEMBER */}
            <div className="form-row">

              <label className="form-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Ingat saya</span>
              </label>

              <a href="#" className="form-forgot">
                Lupa password?
              </a>

            </div>

            {/* BUTTON */}
            <button type="submit" className="login-btn">

              <span>Masuk</span>

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>

            </button>

          </form>

        </div>
      </div>

    </div>
  );
}

export default Login;