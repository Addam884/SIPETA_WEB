import "../../styles/Dashboard.css";
import api from "../../services/api";
import { useEffect, useState } from "react";

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
  CartesianGrid
} from "recharts";

const diseaseColorMap: { [key: string]: string } = {
  ispa: "#2563eb",
  tbc: "#dc2626",
  hiv_aids: "#7c3aed",
  dbd: "#f59e0b",
  diare: "#10b981",
  influenza: "#ec4899",
  malaria: "#14b8a6",
  default: "#64748b"
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [penyakitFilter, setPenyakitFilter] = useState<string>("all");
  const [tahun, setTahun] = useState<number | null>(null);
  const [listTahun, setListTahun] = useState<number[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [wilayahData, setWilayahData] = useState<any[]>([]);
  const [warningData, setWarningData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);


  const fetchDashboard = async (tahunAktif: number) => {
    try {
      const response = await api.get(
        `/dashboard-admin-controller/statistik?tahun=${tahunAktif}`
      );
      setDashboardData(response.data);
    } catch (error) {
      console.error("Gagal mengambil data statistik:", error);
    }
  };


  const fetchTrend = async (tahunAktif: number, idFilter: string) => {
    if (!tahunAktif) return;
    try {
      const res = await api.get(
        `/dashboard-admin-controller/trend?tahun=${tahunAktif}&penyakit_id=${idFilter}`
      );
      setTrendData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data tren:", error);
    }
  };


  const fetchWilayah = async (tahunAktif: number) => {
    if (!tahunAktif) return;
    try {
      const res = await api.get(
        `/dashboard-admin-controller/wilayah?tahun=${tahunAktif}`
      );
      setWilayahData(res.data);
    } catch (error) {
      console.error("Gagal mengambil data wilayah:", error);
    }
  };


  const fetchWarning = async (tahunAktif: number) => {
    if (!tahunAktif) return;
    try {
      const res = await api.get(
        `/dashboard-admin-controller/early-warning?tahun=${tahunAktif}`
      );
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

      if (tahunArray && tahunArray.length > 0) {
        setTahun(tahunArray[0]);
      }
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
        if (key !== "month") {
          allKeys.add(key);
        }
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
      fetchWarning(tahun)
    ]).finally(() => setLoading(false));
  }, [tahun]);


  useEffect(() => {
    if (!tahun) return;
    fetchTrend(tahun, penyakitFilter);
  }, [tahun, penyakitFilter]);


  useEffect(() => {
    fetchTahun();
  }, []);


  if (loading && !dashboardData) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Memuat data dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* FILTER TAHUN */}
      <div className="dashboard-filters-bar">
        <label htmlFor="tahun-select" className="filter-label">
          Pilih Tahun :
        </label>
        <select
          id="tahun-select"
          className="filter-select"
          value={tahun ?? ""}
          onChange={(e) => setTahun(Number(e.target.value))}
        >
          {listTahun.length === 0 ? (
            <option disabled>Loading tahun...</option>
          ) : (
            listTahun.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))
          )}
        </select>
      </div>

      {/* STATS CARD ATAS */}
      <div className="stats-grid-top">
        {dashboardData?.penyakit_terbanyak?.length === 0 ? (
          <div className="card-v2 stat-card">Tidak ada data kasus pada tahun ini</div>
        ) : (
          dashboardData?.penyakit_terbanyak?.map((stat: any, idx: number) => (
            <div key={idx} className="card-v2 stat-card">
              <div className="stat-top">
                <h3>{stat.nama_penyakit}</h3>
                <span className="stat-pill">{stat.kode_icd}</span>
              </div>
              <div className="stat-value">
                {stat.total}
                <span> Kasus</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MAIN LAYOUT */}
      <div className="main-content-grid">
        {/* KIRI STACK */}
        <div className="left-stack">
          {/* TREN CHART CARD */}
          <div className="card-v2">
            <div className="card-header">
              <h3 className="section-title">Tren Penyakit</h3>
              <div className="chart-filters">
                <select
                  className="filter-select-sm"
                  value={penyakitFilter}
                  onChange={(e) => setPenyakitFilter(e.target.value)}
                >
                  <option value="all">Semua</option>
                  {dashboardData?.kasus_by_penyakit?.map((p: any, idx: number) => (
                    <option key={idx} value={p.id}>
                      {p.nama_penyakit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="trend-chart">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="month" label={{ value: 'Bulan', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Jumlah Kasus', angle: -90, position: 'insideLeft', dx: -5 }} />
                  <Tooltip />
                  <Legend formatter={(value) => value.toUpperCase().replace("_", " ")} />
                  {getDynamicLines().map((keyPenyakit) => (
                    <Line
                      key={keyPenyakit}
                      type="monotone"
                      dataKey={keyPenyakit}
                      stroke={diseaseColorMap[keyPenyakit] || diseaseColorMap.default}
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PROGRESS CARDS */}
          <div className="card-v2 progress-card">
            <div className="card-header">
              <h3 className="section-title">Persentase Penyakit</h3>
              <span className="badge">Top 3 Penyakit</span>
            </div>

            {dashboardData?.kasus_by_penyakit?.slice(0, 3).map((item: any, i: number) => {
              const totalKasus = dashboardData?.total_kasus || 0;
              const persen = totalKasus > 0 ? Math.round((item.total / totalKasus) * 100) : 0;

              return (
                <div key={i} className="progress-item">
                  <div className="progress-label">
                    <div className="penyakit-info">
                      <div className="penyakit-dot"></div>
                      <span>{item.nama_penyakit}</span>
                    </div>
                    <span>{item.total} Kasus ({persen}%)</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${persen}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* DISTRIBUSI WILAYAH CARD (Fix Typo Teks) */}
          <div className="card-v2 wilayah-card">
            <div className="card-header">
              <h3 className="section-title">Distribusi Wilayah</h3>
              <span className="stat-pill">Wilayah Tertinggi</span>
            </div>
            <div className="wilayah-chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wilayahData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="wilayah" type="category" width={100} />
                  <Tooltip cursor={{ fill: "rgba(59,130,246,0.08)" }} />
                  <Bar dataKey="kasus" fill="#2563eb" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KANAN STACK - EARLY WARNING */}
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
              // Menambahkan .slice(0, 3) untuk membatasi hanya 3 data teratas
              warningData?.slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className={`warning-box ${item.level === "danger" ? "warning-red" : "warning-yellow"}`}>
                  <div>
                    <div className="warning-title">{item.penyakit}</div>
                    <div className="warning-desc">
                      {item.wilayah}
                      {item.kode_gis && <span className="gis-tag"> ({item.kode_gis})</span>} • {item.total} Kasus
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

      {/* MODAL WINDOW */}
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
                    <th>Kode GIS</th> {/* Ditambahkan agar sesuai dengan jumlah <td> */}
                    <th>Jumlah Kasus</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warningData?.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        Tidak ada wilayah dalam status peringatan. Semua terpantau aman.
                      </td>
                    </tr>
                  ) : (
                    // Di sini tetap memetakan seluruh data tanpa .slice()
                    warningData?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{item.penyakit}</strong></td>
                        <td>{item.wilayah}</td>
                        <td><code>{item.kode_gis || '-'}</code></td>
                        <td>{item.total} Kasus</td>
                        <td>
                          <span className={`status-badge ${item.level === "danger" ? "badge-danger" : "badge-warning"}`}>
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