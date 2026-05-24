import { useEffect, useState } from "react";
import "../../styles/Dashboard.css";
import api from "../../services/api";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
} from "recharts";

const diseaseColorMap: { [key: string]: string } = {
  ispa:      "#6366f1",
  tbc:       "#8b5cf6",
  hiv_aids:  "#06b6d4",
  dbd:       "#f59e0b",
  diare:     "#10b981",
  influenza: "#ec4899",
  malaria:   "#14b8a6",
  default:   "#64748b",
};

const STAT_COLORS = [
  { color: "#6366f1", bg: "#eef2ff" },
  { color: "#8b5cf6", bg: "#f5f3ff" },
  { color: "#06b6d4", bg: "#ecfeff" },
  { color: "#10b981", bg: "#ecfdf5" },
  { color: "#f59e0b", bg: "#fffbeb" },
];

const fmt = (n: number | undefined | null): string =>
  (n ?? 0).toLocaleString("id-ID");

export default function AdminDashboard() {
  const [loading,        setLoading]        = useState(true);
  const [penyakitFilter, setPenyakitFilter] = useState<string>("all");
  const [tahun,          setTahun]          = useState<number | null>(null);
  const [listTahun,      setListTahun]      = useState<number[]>([]);
  const [trendData,      setTrendData]      = useState<any[]>([]);
  const [dashboardData,  setDashboardData]  = useState<any>(null);
  const [wilayahData,    setWilayahData]    = useState<any[]>([]);
  const [warningData,    setWarningData]    = useState<any[]>([]);
  const [showModal,      setShowModal]      = useState<boolean>(false);

  const fetchDashboard = async (tahunAktif: number) => {
    try {
      const res = await api.get(`/dashboard-admin-controller/statistik?tahun=${tahunAktif}`);
      setDashboardData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data statistik:", error);
    }
  };

  const fetchTrend = async (tahunAktif: number, idFilter: string) => {
    if (!tahunAktif) return;
    try {
      const res = await api.get(`/dashboard-admin-controller/trend?tahun=${tahunAktif}&penyakit_id=${idFilter}`);
      setTrendData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data tren:", error);
    }
  };

  const fetchWilayah = async (tahunAktif: number) => {
    if (!tahunAktif) return;
    try {
      const res = await api.get(`/dashboard-admin-controller/wilayah?tahun=${tahunAktif}`);
      setWilayahData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data wilayah:", error);
    }
  };

  const fetchWarning = async (tahunAktif: number) => {
    if (!tahunAktif) return;
    try {
      const res = await api.get(`/dashboard-admin-controller/early-warning?tahun=${tahunAktif}`);
      setWarningData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data early warning:", error);
    }
  };

  const fetchTahun = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard-admin-controller/list-tahun");
      const tahunArray = Array.isArray(res.data) ? res.data : res.data.data;
      setListTahun(tahunArray || []);
      if (tahunArray && tahunArray.length > 0) setTahun(tahunArray[0]);
    } catch (err) {
      console.error("Gagal mengambil daftar tahun:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDynamicLines = () => {
    if (!trendData || trendData.length === 0) return [];
    const allKeys = new Set<string>();
    trendData.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== "month") allKeys.add(key);
      });
    });
    return Array.from(allKeys);
  };

  useEffect(() => {
    if (!tahun) return;
    setLoading(true);
    Promise.all([
      fetchDashboard(tahun),
      fetchWilayah(tahun),
      fetchWarning(tahun),
    ]).finally(() => setLoading(false));
  }, [tahun]);

  useEffect(() => {
    if (!tahun) return;
    fetchTrend(tahun, penyakitFilter);
  }, [tahun, penyakitFilter]);

  useEffect(() => { fetchTahun(); }, []);

  if (loading && !dashboardData) {
    return <div className="sa-loading">Memuat data dashboard…</div>;
  }

  return (
    <div className="sa-dashboard">

      {/* ── FILTER BAR ── */}
      <div className="sa-filter-bar">
        <div className="user-filter-wrapper">
          <label className="user-filter-label">Tahun</label>
          <div className="user-filter-select">
            <select
              value={tahun ?? ""}
              onChange={(e) => setTahun(Number(e.target.value))}
            >
              {listTahun.length === 0 ? (
                <option disabled>Loading tahun...</option>
              ) : (
                listTahun.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))
              )}
            </select>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="user-filter-arrow">
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="sa-stats-grid">
        {dashboardData?.penyakit_terbanyak?.length === 0 ? (
          <div className="dashboard-empty">Tidak ada data kasus pada tahun ini</div>
        ) : (
          dashboardData?.penyakit_terbanyak?.map((stat: any, idx: number) => {
            const c = STAT_COLORS[idx % STAT_COLORS.length];
            return (
              <div key={idx} className="card-v2 sa-stat-card">
                <div className="sa-stat-icon" style={{ background: c.bg, color: c.color }}>
                  🦠
                </div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value" style={{ color: c.color }}>
                    {fmt(stat.total)}
                  </div>
                  <div className="sa-stat-label">{stat.nama_penyakit}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── ROW 2: TREN + EARLY WARNING ── */}
      <div className="sa-row2">

        {/* LINE CHART TREN */}
        <div className="card-v2">
          <div className="sa-card-header">
            <span className="card-title" style={{ marginBottom: 0 }}>Tren Penyakit {tahun}</span>
            <div className="user-filter-select" style={{ minWidth: 140 }}>
              <select
                value={penyakitFilter}
                onChange={(e) => setPenyakitFilter(e.target.value)}
              >
                <option value="all">Semua</option>
                {dashboardData?.kasus_by_penyakit?.map((p: any, idx: number) => (
                  <option key={idx} value={p.id}>{p.nama_penyakit}</option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="user-filter-arrow">
                <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {trendData.length === 0 ? (
            <div className="dashboard-empty">Tidak ada data tren</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background:   "var(--bg-card)",
                    border:       "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize:     "0.85rem",
                  }}
                />
                <Legend
                  formatter={(value) => value.toUpperCase().replace("_", " ")}
                  wrapperStyle={{ fontSize: "0.8rem" }}
                />
                {getDynamicLines().map((keyPenyakit) => (
                  <Line
                    key={keyPenyakit}
                    type="monotone"
                    dataKey={keyPenyakit}
                    stroke={diseaseColorMap[keyPenyakit] || diseaseColorMap.default}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 7 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* EARLY WARNING */}
        <div className="card-v2 warning-panel">
          <div className="warning-header">
            <h3 className="section-title">Early Warning System</h3>
          </div>
          <div className="warning-list">
            {warningData?.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                🟢 Belum ada laporan lonjakan kasus di semua wilayah.
              </div>
            ) : (
              warningData?.slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className={`warning-box ${item.level === "danger" ? "warning-red" : "warning-yellow"}`}>
                  <div>
                    <div className="warning-title">{item.penyakit}</div>
                    <div className="warning-desc">
                      {item.wilayah}
                      {item.kode_gis && <span className="gis-tag"> ({item.kode_gis})</span>}
                      {" "}• {item.total} Kasus
                    </div>
                  </div>
                  <div className="warning-level">
                    {item.level === "danger" ? "🚨" : "⚠️"}
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="btn-detail" onClick={() => setShowModal(true)}>
            Lihat Detail
          </button>
        </div>

      </div>

      {/* ── ROW 3: PERSENTASE + DISTRIBUSI WILAYAH ── */}
      <div className="sa-row3">

        {/* PERSENTASE PENYAKIT */}
        <div className="card-v2">
          <div className="sa-card-header" style={{ marginBottom: 16 }}>
            <span className="card-title" style={{ marginBottom: 0 }}>Persentase Penyakit</span>
            <span className="sa-badge" style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: "999px", background: "#eef2ff", color: "#6366f1", fontWeight: 600 }}>
              Top 3 Penyakit
            </span>
          </div>
          {dashboardData?.kasus_by_penyakit?.slice(0, 3).map((item: any, i: number) => {
            const totalKasus = dashboardData?.total_kasus || 0;
            const persen = totalKasus > 0 ? Math.round((item.total / totalKasus) * 100) : 0;
            const c = STAT_COLORS[i % STAT_COLORS.length];
            return (
              <div key={i} className="sa-role-item">
                <div className="sa-role-header">
                  <span className="sa-role-name">{item.nama_penyakit}</span>
                  <span className="sa-role-count">{fmt(item.total)} ({persen}%)</span>
                </div>
                <div className="sa-progress-track">
                  <div
                    className="sa-progress-fill"
                    style={{ width: `${persen}%`, background: c.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* DISTRIBUSI WILAYAH */}
        <div className="card-v2">
          <div className="sa-card-header" style={{ marginBottom: 16 }}>
            <span className="card-title" style={{ marginBottom: 0 }}>Distribusi Wilayah</span>
            <span className="sa-badge" style={{ fontSize: "0.78rem", padding: "2px 10px", borderRadius: "999px", background: "#ecfeff", color: "#06b6d4", fontWeight: 600 }}>
              Wilayah Tertinggi
            </span>
          </div>
          {wilayahData.length === 0 ? (
            <div className="dashboard-empty">Tidak ada data wilayah</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={wilayahData}
                layout="vertical"
                margin={{ left: -10, right: 10, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="wilayah"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                />
                <Tooltip
                  contentStyle={{
                    background:   "var(--bg-card)",
                    border:       "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize:     "0.85rem",
                  }}
                  cursor={{ fill: "rgba(59,130,246,0.08)" }}
                />
                <Bar dataKey="kasus" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── MODAL EARLY WARNING ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Sebaran & Batas Threshold Wilayah</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Daftar wilayah yang terdeteksi mendekati atau melewati ambang batas tahun <strong>{tahun}</strong>:</p>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Penyakit</th>
                    <th>Wilayah</th>
                    <th>Kode GIS</th>
                    <th>Jumlah Kasus</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warningData?.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        Tidak ada wilayah dalam status peringatan.
                      </td>
                    </tr>
                  ) : (
                    warningData?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{item.penyakit}</strong></td>
                        <td>{item.wilayah}</td>
                        <td><code>{item.kode_gis || '-'}</code></td>
                        <td>{fmt(item.total)} Kasus</td>
                        <td>
                          <span style={{
                            background:   item.level === "danger" ? "#fef2f2" : "#fffbeb",
                            color:        item.level === "danger" ? "#ef4444" : "#f59e0b",
                            padding:      "2px 10px",
                            borderRadius: "999px",
                            fontSize:     "0.8rem",
                            fontWeight:   600,
                          }}>
                            {item.level === "danger" ? "🚨 Danger" : "⚠️ Warning"}
                          </span>
                        </td>
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