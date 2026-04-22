function About() {
  return (
    <section className="about-section">
      <div className="about-container">

        <div className="about-left">
          <div className="section-tag">Tentang Platform</div>

          <h2 className="section-title">
            Mengapa <span className="text-accent">SIPETA</span>?
          </h2>

          <p className="about-desc">
            SIPETA memanfaatkan teknologi Geographic Information System (GIS) terkini untuk
            memvisualisasikan persebaran penyakit secara interaktif, membantu dinas kesehatan
            dalam merespons wabah lebih cepat dan akurat.
          </p>

          <div className="about-highlights">
            <div className="highlight-item">
              <div className="highlight-icon">✓</div>
              <span>Data terintegrasi dari Puskesmas se-Jember</span>
            </div>

            <div className="highlight-item">
              <div className="highlight-icon">✓</div>
              <span>Pembaruan data otomatis setiap hari</span>
            </div>

          </div>
        </div>

        <div className="about-right">
          <div className="about-visual">
            <div className="visual-ring outer"></div>
            <div className="visual-ring middle"></div>
            <div className="visual-ring inner"></div>

            <div className="visual-center">
              <div className="vc-icon">🏥</div>
              <div className="vc-text">GIS Health</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default About;