import React, { useEffect, useState } from "react";
import "../../styles/Dashboard.css";

const diseaseIcons: string[]   = ["🦠", "🫁", "🔬", "🩸", "💧", "🧬", "🫀"];
const puskesmasIcons: string[] = ["🏥", "🏨", "🏪", "🏬", "🏩"];

const miniChartPaths: string[] = [
  "M0 20 Q15 18, 25 22 T50 16 T75 20 T100 15",
  "M0 22 Q20 18, 35 24 T60 16 T80 20 T100 14",
  "M0 18 Q15 22, 30 16 T55 20 T75 14 T100 18",
  "M0 24 Q20 20, 35 22 T60 18 T80 22 T100 16",
  "M0 20 Q18 24, 30 18 T55 22 T75 16 T100 20",
];


import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://103.157.27.220:8000/api";

// ── TYPES ──────────────────────────────────────────────────────────────────────

interface PenyakitStat {
  id?:           number;
  nama_penyakit: string;
  jumlah_kasus:  number;
  persentase:    number;
}

interface TrenBulanan {
  bulan:        string;
  jumlah_kasus: number;
}

interface FaskesStat {
  id:           number;
  nama_faskes:  string;
  jumlah_kasus: number;
  persentase:   number;
}

interface Summary {
  total_kasus:             number;
  total_wilayah:           number;
  penyakit_dominan:        string | null;
  jumlah_penyakit_dominan: number;
}

// Tambah interface baru untuk list penyakit dropdown
interface PenyakitOption {
  id:            number;
  nama_penyakit: string;
}

// ── API FETCH ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("token");
  const res   = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Accept": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const [statsPenyakit, setStatsPenyakit] = useState<PenyakitStat[]>([]);
  const [trenBulanan,   setTrenBulanan]   = useState<TrenBulanan[]>([]);
  const [statsFaskes,   setStatsFaskes]   = useState<FaskesStat[]>([]);
  const [summary,       setSummary]       = useState<Summary | null>(null);
  const [loading,       setLoading]       = useState<boolean>(true);
  const [error,         setError]         = useState<string | null>(null);

  const [tahun,      setTahun]      = useState<number>(new Date().getFullYear());
  const [bulan,      setBulan]      = useState<string>(new Date().toISOString().slice(0, 7));
  const [penyakitId, setPenyakitId] = useState<string>("");
  const [penyakitList, setPenyakitList] = useState<PenyakitOption[]>([]);

  // Sync bulan saat tahun berubah
  useEffect(() => {
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    setBulan(`${tahun}-${m}`);
  }, [tahun]);

  // Fetch data saat filter berubah
  useEffect(() => {
    // Guard: pastikan bulan sudah sesuai tahun yang dipilih
    // supaya tidak fetch dengan bulan lama saat tahun baru dipilih
    if (!bulan.startsWith(String(tahun))) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('tahun', String(tahun));
    params.set('bulan', bulan);
    if (penyakitId) params.set('penyakit_id', penyakitId);

    const paramsTren = new URLSearchParams();
    paramsTren.set('tahun', String(tahun));
    if (penyakitId) paramsTren.set('penyakit_id', penyakitId);

    Promise.all([
      apiFetch<Summary>(`/dashboard/summary?${params.toString()}`),
      apiFetch<any>(`/dashboard/statistik?${params.toString()}`),
      apiFetch<{ data: TrenBulanan[] }>(`/dashboard/tren-bulanan?${paramsTren.toString()}`),
      apiFetch<{ data: FaskesStat[] }>(`/dashboard/stats-faskes?${params.toString()}&limit=5`),
    ])
      .then(([summaryRes, statistikRes, trenRes, faskesRes]) => {
        setSummary(summaryRes);

        const penyakitRaw: any[] = statistikRes.kasus_by_penyakit || [];
        const totalKasus: number = penyakitRaw.reduce((sum, p) => sum + Number(p.total), 0);

        const penyakitMapped: PenyakitStat[] = penyakitRaw.map(p => ({
          id:            p.id,
          nama_penyakit: p.nama_penyakit,
          jumlah_kasus:  Number(p.total),
          persentase:    totalKasus > 0
            ? Math.round((Number(p.total) / totalKasus) * 100 * 10) / 10
            : 0,
        }));

        setStatsPenyakit(penyakitMapped);
        setTrenBulanan(trenRes.data   || []);
        setStatsFaskes(faskesRes.data || []);

        setPenyakitList(prev =>
          prev.length > 0 ? prev : penyakitRaw.map(p => ({
            id:            p.id,
            nama_penyakit: p.nama_penyakit,
          }))
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tahun, bulan, penyakitId]);

  const maxBar = Math.max(...trenBulanan.map(d => d.jumlah_kasus), 1);

  const handleReset = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    setTahun(currentYear);
    setBulan(`${currentYear}-${currentMonth}`);
    setPenyakitId("");
  };

  if (loading) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-loading">Memuat data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-error">⚠️ Gagal memuat data: {error}</div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">

      {/* ── FILTER ── */}
      <div className="user-filters">

        {/* Tahun */}
        <div className="user-filter-wrapper">
          <label className="user-filter-label">Tahun</label>
          <div className="user-filter-select">
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="user-filter-arrow">
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Bulan */}
        <div className="user-filter-wrapper">
          <label className="user-filter-label">Bulan</label>
          <div className="user-filter-select">
            <select value={bulan} onChange={e => setBulan(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => {
                const m      = String(i + 1).padStart(2, "0");
                const thnVal = bulan.split("-")[0];
                const label  = new Date(`${thnVal}-${m}-01`)
                  .toLocaleString("id-ID", { month: "long" });
                return (
                  <option key={m} value={`${thnVal}-${m}`}>{label}</option>
                );
              })}
            </select>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="user-filter-arrow">
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Penyakit */}
        <div className="user-filter-wrapper">
          <label className="user-filter-label">Penyakit</label>
          <div className="user-filter-select">
            <select value={penyakitId} onChange={e => setPenyakitId(e.target.value)}>
              <option value="">Semua Penyakit</option>
              {penyakitList.map(p => (
                <option key={p.id} value={p.id}>{p.nama_penyakit}</option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="user-filter-arrow">
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Tombol Reset */}
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

      {/* ── SUMMARY BANNER ──
      {summary && (
        <div className="user-summary-banner">
          <div className="user-summary-item">
            <span className="user-summary-value">
              {summary.total_kasus?.toLocaleString("id-ID")}
            </span>
            <span className="user-summary-label">Total Kasus</span>
          </div>
          <div className="user-summary-item">
            <span className="user-summary-value">{summary.total_wilayah}</span>
            <span className="user-summary-label">Total Wilayah</span>
          </div>
          <div className="user-summary-item">
            <span className="user-summary-value">{summary.penyakit_dominan ?? "-"}</span>
            <span className="user-summary-label">Penyakit Dominan</span>
          </div>
          <div className="user-summary-item">
            <span className="user-summary-value">
              {summary.jumlah_penyakit_dominan?.toLocaleString("id-ID")}
            </span>
            <span className="user-summary-label">Kasus Dominan</span>
          </div>
        </div>
      )} */}

      {/* ── MAIN ROW ── */}
      <div className="user-main-row">

        {/* ── LEFT ── */}
        <div className="user-left-area">

          {/* STAT CARDS */}
          <div className="user-stats-grid">
            {statsPenyakit.length === 0 ? (
              <div className="dashboard-empty">Tidak ada data penyakit</div>
            ) : (
              statsPenyakit.slice(0, 5).map((item, i) => (
                <div key={i} className="card-v2 user-stat-card">
                  <div className="user-stat-name">{item.nama_penyakit}</div>
                  <div className="user-stat-row">
                    <span className="user-stat-count">
                      {item.jumlah_kasus.toLocaleString("id-ID")}
                    </span>
                    <span className="user-stat-label">Pasien</span>
                  </div>
                  <svg
                    viewBox="0 0 100 30"
                    className="user-mini-chart"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id={`miniGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path
                      d={`${miniChartPaths[i % miniChartPaths.length]} L100 30 L0 30 Z`}
                      fill={`url(#miniGrad${i})`}
                    />
                    <path
                      d={miniChartPaths[i % miniChartPaths.length]}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              ))
            )}
          </div>

          {/* PERSENTASE PENYAKIT */}
          <div className="card-v2">
            <div className="card-title">Persentase Penyakit</div>
            {statsPenyakit.length === 0 ? (
              <div className="dashboard-empty">Tidak ada data</div>
            ) : (
              statsPenyakit.slice(0, 5).map((item, i) => (
                <div key={i} className="user-progress-item">
                  <div className="user-progress-header">
                    <div className="user-progress-icon-name">
                      <div className="user-icon-box">{diseaseIcons[i] ?? "🦠"}</div>
                      <span className="user-progress-name">{item.nama_penyakit}</span>
                    </div>
                    <span className="user-progress-pct">{item.persentase}%</span>
                  </div>
                  <div className="user-progress-track">
                    <div
                      className="user-progress-fill"
                      style={{ width: `${item.persentase}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* ── RIGHT ── */}
        <div className="user-right-area">

          {/* LINE CHART TREN BULANAN */}
          <div className="card-v2">
            <div className="user-chart-header">
              <span className="card-title" style={{ marginBottom: 0 }}>
                Grafik Tren Penyakit {tahun}
              </span>
            </div>
            {trenBulanan.every(d => d.jumlah_kasus === 0) ? (
              <div className="dashboard-empty">Tidak ada data tren untuk tahun {tahun}</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={trenBulanan}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                  <XAxis
                    dataKey="bulan"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    allowDecimals={false}
                  />
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
                    dataKey="jumlah_kasus"
                    name="Jumlah Kasus"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#3b82f6" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* FASILITAS KESEHATAN */}
          <div className="card-v2">
            <div className="card-title">Fasilitas Kesehatan</div>
            {statsFaskes.length === 0 ? (
              <div className="dashboard-empty">Tidak ada data fasilitas kesehatan</div>
            ) : (
              statsFaskes.map((item, i) => (
                <div key={item.id} className="user-progress-item">
                  <div className="user-progress-header">
                    <div className="user-progress-icon-name">
                      <div className="user-icon-box">{puskesmasIcons[i] ?? "🏥"}</div>
                      <span className="user-progress-name user-progress-name-bold">
                        {item.nama_faskes}
                      </span>
                    </div>
                    <div className="user-progress-right">
                      <span className="user-progress-count">
                        {item.jumlah_kasus.toLocaleString("id-ID")} kasus
                      </span>
                      <span className="user-progress-pct">{item.persentase}%</span>
                    </div>
                  </div>
                  <div className="user-progress-track">
                    <div
                      className="user-progress-fill"
                      style={{ width: `${item.persentase}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}