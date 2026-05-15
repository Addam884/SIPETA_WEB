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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ── TYPES ──────────────────────────────────────────────────────────────────────

interface PenyakitStat {
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

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<Summary>(`/dashboard/summary`),
      apiFetch<any>(`/dashboard/statistik?bulan=${bulan}&tahun=${tahun}`),
      apiFetch<{ data: TrenBulanan[] }>(`/dashboard/tren-bulanan?tahun=${tahun}${penyakitId ? `&penyakit_id=${penyakitId}` : ""}`),
      apiFetch<{ data: FaskesStat[] }>(`/dashboard/stats-faskes?tahun=${tahun}&limit=5`),
    ])
      .then(([summaryRes, statistikRes, trenRes, faskesRes]) => {
        setSummary(summaryRes);

        const penyakitRaw: any[]  = statistikRes.kasus_by_penyakit || [];
        const totalKasus: number  = penyakitRaw.reduce((sum, p) => sum + Number(p.total), 0);
        const penyakitMapped: PenyakitStat[] = penyakitRaw.map(p => ({
          nama_penyakit: p.nama_penyakit,
          jumlah_kasus:  Number(p.total),
          persentase:    totalKasus > 0
            ? Math.round((Number(p.total) / totalKasus) * 100 * 10) / 10
            : 0,
        }));

        setStatsPenyakit(penyakitMapped);
        setTrenBulanan(trenRes.data   || []);
        setStatsFaskes(faskesRes.data || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tahun, bulan, penyakitId]);

  const maxBar = Math.max(...trenBulanan.map(d => d.jumlah_kasus), 1);

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
        <div className="user-filter-select">
          <select value={tahun} onChange={e => setTahun(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Bulan */}
        <div className="user-filter-select">
          <select value={bulan} onChange={e => setBulan(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => {
              const m     = String(i + 1).padStart(2, "0");
              const label = new Date(`${tahun}-${m}-01`).toLocaleString("id-ID", { month: "long" });
              return (
                <option key={m} value={`${tahun}-${m}`}>{label} {tahun}</option>
              );
            })}
          </select>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Penyakit */}
        <div className="user-filter-select">
          <select value={penyakitId} onChange={e => setPenyakitId(e.target.value)}>
            <option value="">Semua Penyakit</option>
            {statsPenyakit.map((p, i) => (
              <option key={i} value={p.nama_penyakit}>{p.nama_penyakit}</option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

      </div>

      {/* ── SUMMARY BANNER ── */}
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
      )}

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

          {/* BAR CHART */}
          <div className="card-v2">
            <div className="user-chart-header">
              <span className="card-title" style={{ marginBottom: 0 }}>
                Grafik Tren Penyakit {tahun}
              </span>
            </div>
            {trenBulanan.every(d => d.jumlah_kasus === 0) ? (
              <div className="dashboard-empty">Tidak ada data tren untuk tahun {tahun}</div>
            ) : (
              <div className="user-bar-chart-wrapper">
                <div className="user-y-axis">
                  {[4, 3, 2, 1, 0].map(v => (
                    <span key={v} className="user-y-label">
                      {Math.round((maxBar / 4) * v)}
                    </span>
                  ))}
                </div>
                <div className="user-bars-container">
                  {trenBulanan.map((d, i) => (
                    <div key={i} className="user-bar-item">
                      <div className="user-bar-inner">
                        <div
                          className="user-bar"
                          style={{ height: `${(d.jumlah_kasus / maxBar) * 100}%` }}
                          title={`${d.bulan}: ${d.jumlah_kasus} kasus`}
                        />
                      </div>
                      <span className="user-bar-label">{d.bulan}</span>
                    </div>
                  ))}
                </div>
              </div>
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