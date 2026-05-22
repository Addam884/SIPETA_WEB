import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Login.css"; // Gunakan style yang sama dengan login
import api from "../services/api";
import PasswordInput from "../components/PasswordInput";

function ForgotPassword() {
    // Step 1: Input Email | Step 2: Input OTP | Step 3: Input Password Baru
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Handle Step 1: Kirim Email
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/forgot-password", { email });
            alert("OTP berhasil dikirim ke email Anda!");
            setStep(2);
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal mengirim OTP");
        } finally {
            setLoading(false);
        }
    };

    // Handle Step 2: Verifikasi OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/verify-otp", { email, otp });
            setStep(3);
        } catch (err: any) {
            alert(err.response?.data?.message || "OTP tidak valid");
        } finally {
            setLoading(false);
        }
    };

    // Handle Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/reset-password", { email, otp, password });
            alert("Password berhasil diubah! Silakan login.");
            navigate("/login");
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal mengubah password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* UI Bagian Kiri tetap sama seperti halaman Login agar seragam */}
            <div className="login-left">
                <div className="login-left__bg-grid" />
                <div className="login-left__glow login-left__glow--top" />
                <div className="login-left__glow login-left__glow--bottom" />
                <div className="login-left__content">
                    <h1>SIPETA</h1>
                    <p>Sistem Informasi Pemetaan Penyakit berbasis web...</p>
                </div>
            </div>

            {/* Bagian Kanan - Dinamis berdasarkan 'step' */}
            <div className="login-right">
                <div className="login-right__glow" />
                <div className="login-card">
                    <div className="login-header">
                        <h2>Lupa Password</h2>
                        <p>
                            {step === 1 && "Masukkan email untuk menerima kode OTP"}
                            {step === 2 && "Masukkan kode OTP yang dikirim ke email"}
                            {step === 3 && "Buat password baru Anda"}
                        </p>
                    </div>

                    {/* FORM STEP 1 */}
                    {step === 1 && (
                        <form className="login-form" onSubmit={handleSendOtp}>
                            <div className="form-group">
                                <label>Email</label>

                                <div className="form-group__input-wrap">
                                    {/* 👇 Tambahkan SVG Icon Email di sini 👇 */}
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
                            <button type="submit" className="login-btn" disabled={loading}>
                                <span>{loading ? "Mengirim..." : "Kirim OTP"}</span>
                            </button>
                        </form>
                    )}

                    {/* FORM STEP 2 */}
                    {step === 2 && (
                        <form className="login-form" onSubmit={handleVerifyOtp}>
                            <div className="form-group">
                                <label>Kode OTP</label>
                                <div className="form-group__input-wrap">
                                    <input
                                        type="text"
                                        placeholder="Masukkan 6 digit OTP"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="login-btn" disabled={loading}>
                                <span>{loading ? "Memverifikasi..." : "Verifikasi OTP"}</span>
                            </button>
                            <p className="login-register-link" style={{ marginTop: "1rem", cursor: "pointer" }} onClick={() => setStep(1)}>
                                Salah email? Kembali
                            </p>
                        </form>
                    )}

                    {/* FORM STEP 3 */}
                    {step === 3 && (
                        <form className="login-form" onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label>Password Baru</label>
                                <div className="form-group__input-wrap">
                                    <PasswordInput
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="login-btn" disabled={loading}>
                                <span>{loading ? "Menyimpan..." : "Simpan Password"}</span>
                            </button>
                        </form>
                    )}

                    {/* LINK KEMBALI */}
                    {step === 1 && (
                        <p className="login-register-link" style={{ marginTop: "1.5rem" }}>
                            Ingat password? <Link to="/login">Kembali ke Login</Link>
                        </p>
                    )}

                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;