const features = [
  {
    icon: "🗺️",
    title: "Peta Interaktif GIS",
    desc: "Visualisasi penyebaran penyakit dalam peta geospasial interaktif dengan layer data dinamis."
  },
  {
    icon: "📊",
    title: "Monitoring Kasus",
    desc: "Dashboard statistik komprehensif dengan grafik tren kasus per wilayah dan periode waktu."
  },
  {
    icon: "⚠️",
    title: "Early Warning System",
    desc: "Sistem peringatan dini berbasis analisis clustering untuk mengidentifikasi wilayah dengan potensi peningkatan kasus penyakit."
  },
  {
    icon: "📋",
    title: "Laporan Otomatis",
    desc: "Generate laporan epidemiologi otomatis dalam format PDF siap kirim ke dinas terkait."
  },
  {
    icon: "🧠",
    title: "Analisis Risiko Wilayah",
    desc: "Pengelompokan wilayah berdasarkan tingkat risiko penyakit menggunakan metode K-Means clustering."
  },
  {
    icon: "🏥",
    title: "Jaringan Faskes",
    desc: "Pemetaan fasilitas kesehatan terdekat dengan estimasi kapasitas penanganan kasus."
  },
];

function Features() {
  return (
    <div className="landing">
    <section className="features-section">
      <div className="section-header">
        <div className="section-tag">Fitur Unggulan</div>
        <h2 className="section-title">Semua yang Anda Butuhkan</h2>
        <p className="section-sub">
          Dilengkapi dengan fitur-fitur canggih untuk pengelolaan data kesehatan masyarakat
        </p>
      </div>

      <div className="features-grid">
        {features.map((f, i) => (
          <div className="feature-card" key={i}>
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
            <div className="feature-arrow">→</div>
          </div>
        ))}
      </div>
    </section>
    </div>
  );
}

export default Features;