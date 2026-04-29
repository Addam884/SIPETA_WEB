import '../../styles/Dashboard.css';

export default function SuperadminDashboard() {
  return (
    <div className="dashboard-content">
      <h1 className="page-title text-danger">Superadmin Master Terminal</h1>
      <div className="stats-grid">
        <div className="stat-card border-danger">
          <h3>Sistem Log Error</h3>
          <p className="stat-number text-danger">0</p>
        </div>
        <div className="stat-card">
          <h3>Total Seluruh User</h3>
          <p className="stat-number">1,042</p>
        </div>
        <div className="stat-card">
          <h3>Database Health</h3>
          <p className="stat-status text-accent">Excellent</p>
        </div>
      </div>
      <div className="content-card mt-24">
        <h3>Aktivitas Sistem Terbaru</h3>
        <p className="text-muted">Semua modul berjalan normal pada pukul 20:00 WIB.</p>
      </div>
    </div>
  );
}