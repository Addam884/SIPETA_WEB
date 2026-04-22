const stats = [
  { value: "1,245", label: "Total Kasus", icon: "🦠", trend: "+12% bulan ini" },
  { value: "25", label: "Wilayah Terpantau", icon: "📍", trend: "Seluruh kecamatan" },
  { value: "DBD", label: "Penyakit Dominan", icon: "⚠️", trend: "48% dari total kasus" },
  { value: "3", label: "Zona Risiko Tinggi", icon: "🔴", trend: "Perlu perhatian" },
];

function Stats() {
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