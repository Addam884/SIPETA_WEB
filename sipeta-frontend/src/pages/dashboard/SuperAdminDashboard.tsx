import { useEffect, useState } from "react";
import "../../styles/Dashboard.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stats {
  totalKasus: number;
  totalUsers: number;
  totalFaskes: number;
  totalWilayah: number;
  totalPenyakit: number;
  totalImport: number;
  kasusHariIni: number;
  logError: number;
}

interface UserByRole {
  role: string;
  jumlah: number;
}

interface TrenKasus {
  bulan: string;
  bulan_ke: number;
  jumlah: number;
}

interface ActivityLog {
  user: string;
  aktivitas: string;
  modul: string | null;
  deskripsi: string | null;
  timestamp: string;
}

interface FileImport {
  nama_file: string;
  uploaded_by: string;
  tanggal_upload: string;
  status: string;
  jumlah_data: number;
}

interface KasusLog {
  id:            number;
  kasus_id:      number;
  aksi:          string;
  user:          string;
  nama_penyakit: string;
  kode_icd:      string;
  wilayah:       string;
  faskes:        string;
  tanggal_kasus: string | null;
  timestamp:     string;
}

interface DashboardData {
  stats: Stats;
  users_by_role: UserByRole[];
  tren_kasus: TrenKasus[];
  recent_activity: ActivityLog[];
  recent_imports: FileImport[];
  kasus_log: KasusLog[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number | undefined | null): string =>
  (n ?? 0).toLocaleString("id-ID");

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return "-";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)    return `${diff}d lalu`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}


const ROLE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

const getStatCards = (stats: Stats) => [
  { label: "Total Kasus",      value: fmt(stats.totalKasus),    icon: "🦠", color: "#6366f1", bg: "#eef2ff" },
  { label: "Total User",       value: fmt(stats.totalUsers),    icon: "👥", color: "#8b5cf6", bg: "#f5f3ff" },
  { label: "Faskes Terdaftar", value: fmt(stats.totalFaskes),   icon: "🏥", color: "#06b6d4", bg: "#ecfeff" },
  { label: "Wilayah",          value: fmt(stats.totalWilayah),  icon: "🗺️", color: "#10b981", bg: "#ecfdf5" },
  { label: "Jenis Penyakit",   value: fmt(stats.totalPenyakit), icon: "📋", color: "#f59e0b", bg: "#fffbeb" },
  { label: "Import File",      value: fmt(stats.totalImport),   icon: "📁", color: "#64748b", bg: "#f8fafc" },
  { label: "Kasus Hari Ini",   value: fmt(stats.kasusHariIni),  icon: "📅", color: "#ef4444", bg: "#fef2f2" },
  { label: "Log Error",        value: fmt(stats.logError),      icon: "⚠️", color: "#dc2626", bg: "#fef2f2" },
];

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK: DashboardData = {
  stats: {
    totalKasus: 1247, totalUsers: 38, totalFaskes: 12,
    totalWilayah: 31, totalPenyakit: 8, totalImport: 24,
    kasusHariIni: 14, logError: 0,
  },
  users_by_role: [
    { role: "Superadmin", jumlah: 2 },
    { role: "Admin",      jumlah: 8 },
    { role: "Petugas",    jumlah: 28 },
  ],
  tren_kasus: MONTHS.map((_, i) => ({
    bulan: MONTHS[i], bulan_ke: i + 1,
    jumlah: Math.floor(60 + Math.random() * 120),
  })),
  recent_activity: [
    { user: "Admin Jember",    aktivitas: "Login",        modul: "Auth",     deskripsi: null,               timestamp: new Date(Date.now()-3*60000).toISOString() },
    { user: "Petugas Patrang", aktivitas: "Tambah Kasus", modul: "Kasus",    deskripsi: "Kasus ISPA baru",  timestamp: new Date(Date.now()-15*60000).toISOString() },
    { user: "Admin Mangli",    aktivitas: "Import File",  modul: "Import",   deskripsi: "data_april.xlsx",  timestamp: new Date(Date.now()-45*60000).toISOString() },
    { user: "Superadmin",      aktivitas: "Update User",  modul: "Settings", deskripsi: "Ubah role petugas",timestamp: new Date(Date.now()-2*3600000).toISOString() },
  ],
  recent_imports: [
    { nama_file: "data_april_2025.xlsx", uploaded_by: "Admin Mangli",    tanggal_upload: new Date(Date.now()-3600000).toISOString(),    status: "sukses", jumlah_data: 142 },
    { nama_file: "kasus_maret.xlsx",     uploaded_by: "Admin Jember",    tanggal_upload: new Date(Date.now()-86400000).toISOString(),   status: "sukses", jumlah_data: 98  },
    { nama_file: "data_feb.xlsx",        uploaded_by: "Petugas Patrang", tanggal_upload: new Date(Date.now()-2*86400000).toISOString(), status: "gagal",  jumlah_data: 0   },
  ],
  kasus_log: [
    { id: 1, kasus_id: 101, aksi: "Tambah", user: "Petugas Patrang", nama_penyakit: "ISPA",  kode_icd: "J06.9", wilayah: "Jember",   faskes: "Puskesmas Patrang",  tanggal_kasus: new Date(Date.now()-3*86400000).toISOString(), timestamp: new Date(Date.now()-3*86400000).toISOString() },
    { id: 2, kasus_id: 102, aksi: "Edit",   user: "Admin Jember",   nama_penyakit: "TBC",   kode_icd: "A15.0", wilayah: "Jember",   faskes: "RSUD Jember",        tanggal_kasus: new Date(Date.now()-2*86400000).toISOString(), timestamp: new Date(Date.now()-2*86400000).toISOString() },
    { id: 3, kasus_id: 103, aksi: "Hapus",  user: "Admin Mangli",   nama_penyakit: "Diare", kode_icd: "A09",   wilayah: "Lumajang", faskes: "Puskesmas Senduro",  tanggal_kasus: new Date(Date.now()-86400000).toISOString(),   timestamp: new Date(Date.now()-86400000).toISOString() },
  ],
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function SuperadminDashboard() {

  const [data,             setData]             = useState<DashboardData | null>(null);
  const [loading,          setLoading]          = useState<boolean>(true);
  const [error,            setError]            = useState<string | null>(null);
  const [tahunFilter,      setTahunFilter]      = useState<number>(new Date().getFullYear());
  const [showKasusModal,   setShowKasusModal]   = useState<boolean>(false);
  const [showActivityModal,setShowActivityModal] = useState<boolean>(false);
  const [showImportModal,  setShowImportModal]  = useState<boolean>(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://103.157.27.220:8000/api";

  const handleReset = () => setTahunFilter(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/superadmin/dashboard?tahun=${tahunFilter}`, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DashboardData>;
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => {
        console.warn("API error, pakai mock data:", err.message);
        setData(MOCK);
        setError("Menggunakan data dummy (API belum terhubung)");
        setLoading(false);
      });
  }, [tahunFilter]);

  if (loading) return <div className="sa-loading">Memuat data dashboard…</div>;
  if (!data)   return null;

  const { stats, users_by_role, tren_kasus, recent_activity, recent_imports, kasus_log } = data;

  const barData = MONTHS.map((_, i) => {
    const found = tren_kasus.find((t) => t.bulan_ke === i + 1);
    return found ? Number(found.jumlah) : 0;
  });
  const totalByRole = users_by_role.reduce((s, x) => s + Number(x.jumlah), 0);

  return (
    <div className="sa-dashboard">

      {/* ── FILTER BAR ── */}
      <div className="sa-filter-bar">
        <div className="user-filter-wrapper">
          <label className="user-filter-label">Tahun</label>
          <div className="user-filter-select">
            <select value={tahunFilter} onChange={e => setTahunFilter(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="user-filter-arrow">
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div className="user-filter-wrapper">
          <label className="user-filter-label">&nbsp;</label>
          <button className="user-filter-reset" onClick={handleReset}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1v4h4M13 7A6 6 0 1 1 7 1a6 6 0 0 1 4.243 1.757L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* ── DEV WARNING ── */}
      {error && (
        <div className="sa-dev-warning"><span>⚠️</span> {error}</div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="sa-stats-grid">
        {getStatCards(stats).map((s, i) => (
          <div key={i} className="card-v2 sa-stat-card">
            <div className="sa-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="sa-stat-info">
              <div className="sa-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="sa-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: CHART + ROLE ── */}
      <div className="sa-row2">
        <div className="card-v2">
          <div className="sa-card-header">
            <span className="card-title" style={{ marginBottom: 0 }}>Tren Kasus {tahunFilter}</span>
          </div>
          {barData.every(v => v === 0) ? (
            <div className="dashboard-empty">Tidak ada data tren untuk tahun {tahunFilter}</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={MONTHS.map((bulan, i) => ({ bulan, jumlah: barData[i] }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.85rem" }} />
                <Line type="monotone" dataKey="jumlah" name="Jumlah Kasus" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-v2">
          <div className="card-title">User per Role</div>
          {users_by_role.length === 0 && <p className="sa-empty">Tidak ada data</p>}
          {users_by_role.map((r, i) => {
            const pct = totalByRole ? Math.round((r.jumlah / totalByRole) * 100) : 0;
            return (
              <div key={i} className="sa-role-item">
                <div className="sa-role-header">
                  <span className="sa-role-name">{r.role}</span>
                  <span className="sa-role-count">{fmt(r.jumlah)} ({pct}%)</span>
                </div>
                <div className="sa-progress-track">
                  <div className="sa-progress-fill" style={{ width: `${pct}%`, background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ROW 3: LOGS + IMPORTS ── */}
      <div className="sa-row3">

        {/* ── ACTIVITY LOG ── */}
        <div className="card-v2 warning-panel">
          <div className="warning-header">
            <h3 className="section-title">Aktivitas Sistem Terbaru</h3>
          </div>
          <div className="warning-list">
            {recent_activity.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                📋 Belum ada aktivitas tercatat.
              </div>
            ) : (
              recent_activity.slice(0, 3).map((a, i) => (
                <div key={i} className="warning-box warning-yellow">
                  <div>
                    <div className="warning-title">{a.user}</div>
                    <div className="warning-desc">
                      {a.aktivitas}
                      {a.modul && <span> · {a.modul}</span>}
                      {a.deskripsi && <span> · {a.deskripsi}</span>}
                      <span style={{ display: "block", marginTop: "2px", color: "#94a3b8", fontSize: "0.78rem" }}>
                        {timeAgo(a.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="warning-level">⚠️</div>
                </div>
              ))
            )}
          </div>
          <button className="btn-detail" onClick={() => setShowActivityModal(true)}>
            Lihat Detail
          </button>
        </div>

        {/* ── KASUS AUDIT LOG ── */}
        <div className="card-v2 warning-panel">
          <div className="warning-header">
            <h3 className="section-title">Audit Kasus (Log)</h3>
          </div>
          <div className="warning-list">
            {kasus_log.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                📋 Belum ada aktivitas kasus tercatat.
              </div>
            ) : (
              kasus_log.slice(0, 3).map((k, i) => (
                <div key={i} className={`warning-box ${k.aksi === "Hapus" ? "warning-red" : "warning-yellow"}`}>
                  <div>
                    <div className="warning-title">{k.nama_penyakit}</div>
                    <div className="warning-desc">
                      {k.wilayah} · {k.faskes}
                      {k.tanggal_kasus && (
                        <span> · {new Date(k.tanggal_kasus).toLocaleDateString("id-ID")}</span>
                      )}
                      <span style={{ display: "block", marginTop: "2px", color: "#94a3b8", fontSize: "0.78rem" }}>
                        oleh {k.user}
                      </span>
                    </div>
                  </div>
                  <div className="warning-level">{k.aksi === "Hapus" ? "🚨" : "⚠️"}</div>
                </div>
              ))
            )}
          </div>
          <button className="btn-detail" onClick={() => setShowKasusModal(true)}>
            Lihat Detail
          </button>
        </div>

        {/* ── FILE IMPORT ── */}
        <div className="card-v2 warning-panel">
          <div className="warning-header">
            <h3 className="section-title">Import File Terbaru</h3>
          </div>
          <div className="warning-list">
            {recent_imports.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                📁 Belum ada file yang diimport.
              </div>
            ) : (
              recent_imports.slice(0, 3).map((f, i) => (
                <div key={i} className={`warning-box ${f.status === "gagal" ? "warning-red" : "warning-yellow"}`}>
                  <div>
                    <div className="warning-title">{f.nama_file}</div>
                    <div className="warning-desc">
                      {f.uploaded_by} · {fmt(f.jumlah_data)} data
                      <span style={{ display: "block", marginTop: "2px", color: "#94a3b8", fontSize: "0.78rem" }}>
                        {timeAgo(f.tanggal_upload)}
                      </span>
                    </div>
                  </div>
                  <div className="warning-level">{f.status === "gagal" ? "🚨" : "⚠️"}</div>
                </div>
              ))
            )}
          </div>
          <button className="btn-detail" onClick={() => setShowImportModal(true)}>
            Lihat Detail
          </button>
        </div>

      </div> {/* tutup sa-row3 */}

      {/* ── MODAL ACTIVITY LOG ── */}
      {showActivityModal && (
        <div className="modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Aktivitas Sistem</h2>
              <button className="modal-close-btn" onClick={() => setShowActivityModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Daftar aktivitas sistem pada tahun <strong>{tahunFilter}</strong>:</p>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>User</th>
                    <th>Aktivitas</th>
                    <th>Modul</th>
                    <th>Deskripsi</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_activity.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        Tidak ada data aktivitas.
                      </td>
                    </tr>
                  ) : (
                    recent_activity.map((a, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{a.user}</strong></td>
                        <td>{a.aktivitas}</td>
                        <td>{a.modul ?? "-"}</td>
                        <td>{a.deskripsi ?? "-"}</td>
                        <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{timeAgo(a.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AUDIT KASUS ── */}
      {showKasusModal && (
        <div className="modal-overlay" onClick={() => setShowKasusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Audit Kasus (Log)</h2>
              <button className="modal-close-btn" onClick={() => setShowKasusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Daftar aktivitas kasus yang tercatat pada tahun <strong>{tahunFilter}</strong>:</p>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Penyakit</th>
                    <th>Wilayah</th>
                    <th>Faskes</th>
                    <th>Tanggal Kasus</th>
                    <th>Oleh</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {kasus_log.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        Tidak ada data audit kasus.
                      </td>
                    </tr>
                  ) : (
                    kasus_log.map((k, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{k.nama_penyakit}</strong></td>
                        <td>{k.wilayah}</td>
                        <td>{k.faskes}</td>
                        <td>{k.tanggal_kasus ? new Date(k.tanggal_kasus).toLocaleDateString("id-ID") : "-"}</td>
                        <td>{k.user}</td>
                        <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{timeAgo(k.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FILE IMPORT ── */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Import File</h2>
              <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Daftar file yang diimport pada tahun <strong>{tahunFilter}</strong>:</p>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama File</th>
                    <th>Diupload Oleh</th>
                    <th>Jumlah Data</th>
                    <th>Status</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_imports.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        Tidak ada data import.
                      </td>
                    </tr>
                  ) : (
                    recent_imports.map((f, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{f.nama_file}</td>
                        <td>{f.uploaded_by}</td>
                        <td>{fmt(f.jumlah_data)} data</td>
                        <td>
                          <span style={{
                            background:   f.status === "sukses" ? "#dcfce7" : "#fef9c3",
                            color:        f.status === "sukses" ? "#16a34a" : "#ca8a04",
                            padding:      "2px 10px",
                            borderRadius: "999px",
                            fontSize:     "0.8rem",
                            fontWeight:   600,
                          }}>
                            {f.status}
                          </span>
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{timeAgo(f.tanggal_upload)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}