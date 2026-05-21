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
    ispa: "#2563eb",       // Biru
    tbc: "#dc2626",        // Merah
    hiv_aids: "#7c3aed",   // Ungu
    dbd: "#f59e0b",        // Orange
    diare: "#10b981",      // Hijau
    influenza: "#ec4899",  // Pink (Contoh jika ada penyakit baru)
    malaria: "#14b8a6",    // Tosca (Contoh jika ada penyakit baru)
    default: "#64748b"     // Abu-abu (Warna cadangan jika penyakit tidak terdaftar)
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
  

  const fetchDashboard = async (tahunAktif: number) => {
    try {
      setLoading(true);

      const response = await api.get(
        `/dashboard-admin-controller/statistik?tahun=${tahunAktif}`
      );

      setDashboardData(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
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

    const res = await api.get(
      `/dashboard-admin-controller/wilayah?tahun=${tahunAktif}`
    );
    setWilayahData(res.data);
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
      const res = await api.get("/dashboard-admin-controller/list-tahun");

      const tahunArray = Array.isArray(res.data)
        ? res.data
        : res.data.data;

      setListTahun(tahunArray);

      if (tahunArray.length > 0) {
        setTahun(tahunArray[0]); // <- ini penting banget
      }

    } catch (err) {
      console.error(err);
    }
  };

  const getDynamicLines = () => {
    if (trendData.length === 0) return [];
    
    // Mengumpulkan semua key penyakit dari semua bulan agar tidak zonk
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

    fetchDashboard(tahun);
    fetchWilayah(tahun);
    fetchWarning(tahun);
  }, [tahun]);

  useEffect(() => {
    if (!tahun) return;
    fetchTrend(tahun, penyakitFilter);
  }, [tahun, penyakitFilter]);

  useEffect(() => {
    fetchTahun();
  }, []);

  
 

  return (
    <div className="dashboard-container">

      {/* FILTER */}
      <div className="dashboard-filters-bar">
        {/* Tambahkan label di sini */}
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

      {/* STATS */}
      <div className="stats-grid-top">

        {dashboardData?.penyakit_terbanyak?.map((stat: any, idx: number) => (

          <div key={idx} className="card-v2 stat-card">

            <div className="stat-top">

              <h3>{stat.nama_penyakit}</h3>

              <span className="stat-pill">
                {stat.kode_icd}
              </span>

            </div>

            <div className="stat-value">
              {stat.total}
              <span> Kasus</span>
            </div>

          </div>

        ))}

      </div>

      {/* MAIN GRID */}
      <div className="main-content-grid">

        {/* LEFT */}
        <div className="left-stack">

          {/* CHART */}
          <div className="card-v2">

            <div className="card-header">

              <h3 className="section-title">
                Tren Penyakit
              </h3>

              <div className="chart-filters">
                <select
                  className="filter-select-sm"
                  value={penyakitFilter}
                  onChange={(e) => setPenyakitFilter(e.target.value)}
                >
                  <option value="all">Semua</option>
                  
                  {/* Mengambil daftar penyakit dan ID-nya langsung dari database melalui dashboardData */}
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

                <LineChart data={trendData} >
                  <CartesianGrid strokeDasharray="4 4" />
                  
                  {/* Sumbu X (Horizontal) - Menambahkan label "Bulan" di bagian bawah */}
                  <XAxis 
                    dataKey="month" 
                    label={{ value: 'Bulan', position: 'insideBottom', offset: -5 }} 
                  />
                  
                  {/* Sumbu Y (Vertikal) - Menambahkan label "Jumlah Kasus" di samping kiri */}
                  <YAxis label={{ value: 'Jumlah Kasus', angle: -90, position: 'center', dx: -25 }} 
                  />
                  
                  <Tooltip />
                  <Legend formatter={(value) => value.toUpperCase().replace("_", " ")} />

                  {/* Menggambar garis secara dinamis sesuai data yang dikirim backend */}
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

          {/* PERSENTASE PENYAKIT */}
          <div className="card-v2 progress-card">

            <div className="card-header">

              <h3 className="section-title">
                Persentase Penyakit
              </h3>

              <span className="badge">
                Top 3 Penyakit
              </span>

            </div>

            {dashboardData?.kasus_by_penyakit
              ?.slice(0, 3)
              ?.map((item: any, i: number) => {

                const totalKasus = dashboardData?.total_kasus || 0;

                const persen = totalKasus > 0
                  ? Math.round((item.total / totalKasus) * 100)
                  : 0;

                return (
                  <div key={i} className="progress-item">

                    <div className="progress-label">

                      <div className="penyakit-info">
                        <div className="penyakit-dot"></div>

                        <span>
                          {item.nama_penyakit}
                        </span>
                      </div>

                      <span>
                        {item.total} Kasus ({persen}%)
                      </span>

                    </div>

                    <div className="progress-track">

                      <div
                        className="progress-fill"
                        style={{
                          width: `${persen}%`
                        }}
                      />

                    </div>

                  </div>
                );
              })}

          </div>


          {/* DISTRIBUSI WILAYAH */}
          <div className="card-v2 wilayah-card">

            <div className="card-header">

              <h3 className="section-title">
                Distribusi Wilayah
              </h3>

              <span className="stat-pill">
                Wilayah Tertinggi
              </span>

            </div>

            <div className="wilayah-chart-wrapper">

              <ResponsiveContainer width="100%" height={300}>

                <BarChart
                  data={wilayahData}
                  layout="vertical"
                  margin={{ left: -60, right: 10, top: 10, bottom: 10 }}
                >

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis type="number" />

                  <YAxis
                    dataKey="wilayah"
                    type="category"
                    width={120}
                  />

                  <Tooltip cursor={{ fill: "rgba(59,130,246,0.08)" }} />

                  <Bar
                    dataKey="kasus"
                    radius={[0, 8, 8, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

        {/* RIGHT */}
        <div className="card-v2 warning-panel">

          <div className="warning-header">

            <h3 className="section-title">
              Early Warning System
            </h3>

          </div>

          <div className="warning-list">

            {warningData?.map((item: any, idx: number) => (

              <div
                key={idx}
                className={`warning-box ${
                  item.level === "danger"
                    ? "warning-red"
                    : "warning-yellow"
                }`}
              >

                <div>

                  <div className="warning-title">
                    {item.penyakit}
                  </div>

                  <div className="warning-desc">
                    {item.wilayah} • {item.total} Kasus
                  </div>

                </div>

                <div className="warning-level">

                  {item.level === "danger"
                    ? "🚨"
                    : "⚠️"}

                </div>

              </div>

            ))}

          </div>

          <button className="btn-detail">
            Lihat Detail
          </button>

        </div>

      </div>

    </div>
  );
}