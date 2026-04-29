import '../../styles/Dashboard.css'; // Kita buat file CSS umum untuk semua dashboard

export default function UserDashboard() {
  return (
    <div className="dashboard-content">
      <h1 className="page-title">Dashboard Pengguna</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Laporan Saya</h3>
          <p className="stat-number">12</p>
        </div>
        <div className="stat-card">
          <h3>Status Verifikasi</h3>
          <p className="stat-status text-accent">Aktif</p>
        </div>
      </div>
      <div className="content-card mt-24">
        <h3>Riwayat Pemetaan Terakhir</h3>
        <p>Belum ada data terbaru untuk ditampilkan.</p>
      </div>
    </div>
  );
}