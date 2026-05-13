import { useEffect, useState } from "react";
import api from "../services/api";

function Stats() {
  const [stats, setStats] = useState([
    { value: "-", label: "Total Kasus", icon: "🦠", trend: "Loading..." },
    { value: "-", label: "Wilayah Terpantau", icon: "📍", trend: "Loading..." },
    { value: "-", label: "Penyakit Dominan", icon: "⚠️", trend: "Loading..." },
    { value: "-", label: "Zona Risiko Tinggi", icon: "🔴", trend: "Loading..." },
  ]);

  useEffect(() => {
    api.get("/kasus/stats-summary")
      .then((res) => {
        const data = res.data;

        setStats([
          {
            value: data.total_kasus,
            label: "Total Kasus",
            icon: "🦠",
            trend: "Semua data kasus",
          },
          {
            value: data.total_wilayah,
            label: "Wilayah Terpantau",
            icon: "📍",
            trend: "Wilayah terdata",
          },
          {
            value: data.penyakit_dominan ?? "-",
            label: "Penyakit Dominan",
            icon: "⚠️",
            trend: `${data.jumlah_penyakit_dominan ?? 0} kasus`,
          },
          {
            value: "-", // nanti bisa kamu isi dari clustering
            label: "Zona Risiko Tinggi",
            icon: "🔴",
            trend: "Belum dihitung",
          },
        ]);
      })
      .catch((err) => {
        console.error("Gagal ambil stats:", err);
      });
  }, []);

  return (
    <section className="stats-section">
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-trend">{s.trend}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Stats;