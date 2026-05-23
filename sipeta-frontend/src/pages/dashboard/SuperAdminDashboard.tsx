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

const AKSI_COLOR: Record<string, string> = {
  Tambah: "#22c55e",
  Edit:   "#f59e0b",
  Hapus:  "#ef4444",
};

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
    { user: "Admin Jember",   aktivitas: "Login",        modul: "Auth",     deskripsi: null,               timestamp: new Date(Date.now()-3*60000).toISOString() },
    { user: "Petugas Patrang",aktivitas: "Tambah Kasus", modul: "Kasus",    deskripsi: "Kasus ISPA baru",  timestamp: new Date(Date.now()-15*60000).toISOString() },
    { user: "Admin Mangli",   aktivitas: "Import File",  modul: "Import",   deskripsi: "data_april.xlsx",  timestamp: new Date(Date.now()-45*60000).toISOString() },
    { user: "Superadmin",     aktivitas: "Update User",  modul: "Settings", deskripsi: "Ubah role petugas",timestamp: new Date(Date.now()-2*3600000).toISOString() },
  ],
  recent_imports: [
    { nama_file: "data_april_2025.xlsx", uploaded_by: "Admin Mangli",    tanggal_upload: new Date(Date.now()-3600000).toISOString(),    status: "sukses", jumlah_data: 142 },
    { nama_file: "kasus_maret.xlsx",     uploaded_by: "Admin Jember",    tanggal_upload: new Date(Date.now()-86400000).toISOString(),   status: "sukses", jumlah_data: 98  },
    { nama_file: "data_feb.xlsx",        uploaded_by: "Petugas Patrang", tanggal_upload: new Date(Date.now()-2*86400000).toISOString(), status: "gagal",  jumlah_data: 0   },
  ],
  kasus_log: [
    { id: 1, kasus_id: 101, aksi: "Tambah", user: "Petugas Patrang", nama_penyakit: "ISPA", kode_icd: "J06.9", wilayah: "Jember", faskes: "Puskesmas Patrang", tanggal_kasus: new Date(Date.now()-3*86400000).toISOString(), timestamp: new Date(Date.now()-3*86400000).toISOString() },
    { id: 2, kasus_id: 102, aksi: "Edit",   user: "Admin Jember",   nama_penyakit: "TBC",  kode_icd: "A15.0", wilayah: "Jember", faskes: "RSUD Jember",     tanggal_kasus: new Date(Date.now()-2*86400000).toISOString(), timestamp: new Date(Date.now()-2*86400000).toISOString() },
    { id: 3, kasus_id: 103, aksi: "Hapus",  user: "Admin Mangli",   nama_penyakit: "Diare", kode_icd: "A09",   wilayah: "Lumajang", faskes: "Puskesmas Senduro", tanggal_kasus: new Date(Date.now()-86400000).toISOString(), timestamp: new Date(Date.now()-86400000).toISOString() },
  ],
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function SuperadminDashboard() {

  // ✅ SEMUA useState harus di dalam component
  const [data,         setData]         = useState<DashboardData | null>(null);
  const [loading,      setLoading]      = useState<boolean>(true);
  const [error,        setError]        = useState<string | null>(null);
  const [tahunFilter,  setTahunFilter]  = useState<number>(new Date().getFullYear());

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  // ✅ handleReset juga harus di dalam component
  const handleReset = () => {
    setTahunFilter(new Date().getFullYear());
  };

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
      .then((json) => {
        setData(json);
        setLoading(false);
      })
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
            <select
              value={tahunFilter}
              onChange={e => setTahunFilter(Number(e.target.value))}
            >
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
        <div className="sa-dev-warning">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="sa-stats-grid">
        {getStatCards(stats).map((s, i) => (
          <div key={i} className="card-v2 sa-stat-card">
            <div className="sa-stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="sa-stat-info">
              <div className="sa-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="sa-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: CHART + ROLE ── */}
      <div className="sa-row2">

        {/* Line Chart */}
        <div className="card-v2">
          <div className="sa-card-header">
            <span className="card-title" style={{ marginBottom: 0 }}>
              Tren Kasus {tahunFilter}
            </span>
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
                <Tooltip
                  contentStyle={{
                    background:   "var(--bg-card)",
                    border:       "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize:     "0.85rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="jumlah"
                  name="Jumlah Kasus"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* User per Role */}
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
                  <div
                    className="sa-progress-fill"
                    style={{ width: `${pct}%`, background: ROLE_COLORS[i % ROLE_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ROW 3: LOGS + IMPORTS ── */}
      <div className="sa-row3">

        {/* Activity Log */}
        <div className="card-v2">
          <div className="card-title">Aktivitas Sistem Terbaru</div>
          {recent_activity.length === 0 && <p className="sa-empty">Tidak ada aktivitas</p>}
          <div className="sa-log-list">
            {recent_activity.map((a, i) => (
              <div key={i} className="sa-log-item">
                <div className="sa-log-avatar">
                  {(a.user ?? "?")[0].toUpperCase()}
                </div>
                <div className="sa-log-body">
                  <div className="sa-log-title">
                    <strong>{a.user}</strong> — {a.aktivitas}
                    {a.modul && <span className="sa-badge">{a.modul}</span>}
                  </div>
                  {a.deskripsi && <div className="sa-log-desc">{a.deskripsi}</div>}
                </div>
                <div className="sa-log-time">{timeAgo(a.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Kasus Audit Log */}
        <div className="card-v2">
          <div className="card-title">Audit Kasus (Log)</div>
          {kasus_log.length === 0 && <p className="sa-empty">Tidak ada log</p>}
          <div className="sa-log-list">
            {kasus_log.map((k, i) => (
              <div key={i} className="sa-log-item">
                <div
                  className="sa-aksi-badge"
                  style={{
                    background: (AKSI_COLOR[k.aksi] ?? "#64748b") + "20",
                    color:      AKSI_COLOR[k.aksi] ?? "#64748b",
                  }}
                >
                  {k.aksi}
                </div>
                <div className="sa-log-body">
                  <div className="sa-log-title">
                    <strong>{k.nama_penyakit}</strong>
                    <span className="sa-badge">{k.kode_icd}</span>
                  </div>
                  <div className="sa-log-desc">
                    {k.wilayah} · {k.faskes}
                    {k.tanggal_kasus && (
                      <span> · {new Date(k.tanggal_kasus).toLocaleDateString("id-ID")}</span>
                    )}
                  </div>
                  <div className="sa-log-desc" style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                    oleh {k.user}
                  </div>
                </div>
                <div className="sa-log-time">{timeAgo(k.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* File Import */}
        <div className="card-v2">
          <div className="card-title">Import File Terbaru</div>
          {recent_imports.length === 0 && <p className="sa-empty">Belum ada import</p>}
          <div className="sa-import-list">
            {recent_imports.map((f, i) => (
              <div key={i} className="sa-import-item">
                <div className="sa-import-icon">📁</div>
                <div className="sa-import-body">
                  <div className="sa-import-name">{f.nama_file}</div>
                  <div className="sa-import-meta">{f.uploaded_by} · {fmt(f.jumlah_data)} data</div>
                </div>
                <div className="sa-import-right">
                  <span
                    className="sa-status-badge"
                    style={{
                      background: f.status === "sukses" ? "#dcfce7" : "#fef9c3",
                      color:      f.status === "sukses" ? "#16a34a" : "#ca8a04",
                    }}
                  >
                    {f.status}
                  </span>
                  <div className="sa-log-time">{timeAgo(f.tanggal_upload)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}