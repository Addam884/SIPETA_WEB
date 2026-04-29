import { useState } from "react";
import "../styles/Login.css";

function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi sederhana
        if (password !== confirmPassword) {
            alert("Password tidak sama!");
            return;
        }

        console.log({
            name,
            email,
            password,
        });

        // TODO: panggil API register di sini
    };

    return (
        <div className="login-page">

            {/* LEFT SIDE (reuse dari login) */}
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
                        Sistem Informasi Pemetaan Penyakit berbasis web untuk membantu
                        visualisasi dan analisis data kesehatan secara geografis.
                    </p>
                </div>
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

            {/* RIGHT SIDE */}
            <div className="login-right">
                <div className="login-right__glow" />

                <div className="login-card">

                    <div className="login-header">
                        <h2>Daftar Akun</h2>
                        <p>Buat akun baru SIPETA</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>

                        {/* NAMA */}
                        <div className="form-group">
                            <label>Nama</label>

                            <div className="form-group__input-wrap">

                                <svg className="form-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>

                                <input
                                    type="text"
                                    placeholder="Nama lengkap"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* EMAIL */}
                        <div className="form-group">
                            <label>Email</label>
                            <div className="form-group__input-wrap">
                                <svg className="form-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

                        {/* KONFIRMASI PASSWORD */}
                        <div className="form-group">
                            <label>Konfirmasi Password</label>
                            <div className="form-group__input-wrap">
                                <svg className="form-group__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    type="password"
                                    placeholder="Ulangi password..."
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* BUTTON */}
                        <button type="submit" className="login-btn">
                            <span>Daftar</span>
                        </button>

                        {/* LINK KE LOGIN */}
                        <p style={{ textAlign: "center", fontSize: "13px", marginTop: "10px" }}>
                            Sudah punya akun? <a href="/login">Masuk</a>
                        </p>

                    </form>

                </div>
            </div>

        </div>
    );
}

export default Register;