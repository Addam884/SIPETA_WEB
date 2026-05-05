import '../../styles/Dashboard.css';

export default function AdminDashboard() {
  return (
    <div>
      {/* Header & Filters */}
      <div className="dashboard-header">
        
        <div className="dashboard-filters">
          <select className="filter-select">
            <option>Timeframe: All-time</option>
          </select>
          <select className="filter-select">
            <option>Penyakit: All</option>
          </select>
          <select className="filter-select">
            <option>Topic: All</option>
          </select>
        </div>
      </div>

      {/* Row 1: Top Stats */}
      <div className="stats-grid-top">
        {[
          { label: 'ISPA', count: 231 },
          { label: 'TBC', count: 178 },
          { label: 'HIV/AIDS', count: 110 },
          { label: 'DBD', count: 87 },
          { label: 'Diare', count: 80 }
        ].map((stat, idx) => (
          <div key={idx} className="card-v2 stat-card-mini">
            <h3 className="card-title">{stat.label}</h3>
            <div className="stat-value-large">
              {stat.count} <span>Pasien</span>
            </div>
            <div className="mini-chart-mockup"></div>
          </div>
        ))}
      </div>

      {/* Row 2: Main Layout */}
      <div className="main-content-grid">
        {/* Left Column: Charts & Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card-v2">
            <div className="chart-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>
                Grafik Tren Penyakit
              </h3>

              <div className="chart-filters">
                <select className="filter-select-sm">
                  <option value="penyakit">Semua Penyakit</option>
                  <option value="ispa">ISPA</option>
                  <option value="tbc">TBC</option>
                  <option value="hiv">HIV/AIDS</option>
                  <option value="dbd">DBD</option>
                </select>

                <select className="filter-select-sm">
                  <option value="month">Bulanan</option>
                  <option value="week">Mingguan</option>
                  <option value="year">Tahunan</option>
                </select>
              </div>
            </div>
            
            {/* Mockup Bar Chart */}
           <div className="trend-chart">
            <svg viewBox="0 0 600 200" className="trend-svg">

              {/* area fill */}
              <path
                d="
                  M0,160
                  C60,140 120,150 180,100
                  C240,50 300,130 360,150
                  C420,170 480,60 540,50
                  C570,45 590,40 600,40
                  L600,200 L0,200 Z
                "
                fill="rgba(59,130,246,0.15)"
              />

              {/* line */}
              <path
                d="
                  M0,160
                  C60,140 120,150 180,100
                  C240,50 300,130 360,150
                  C420,170 480,60 540,50
                  C570,45 590,40 600,40
                "
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span>
            </div>
          </div>

          <div className="card-v2">
            <h3 className="card-title">Persentase Penyakit</h3>
            <div className="progress-item">
              <div className="progress-label"><span>ISPA</span><span>74%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: '74%', background: 'linear-gradient(90deg, #f97316 0%, #fca5a5 100%)' }}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>TBC</span><span>52%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: '52%', background: 'linear-gradient(90deg, #f97316 0%, #fca5a5 100%)' }}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>HIV/AIDS</span><span>36%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: '36%', background: 'linear-gradient(90deg, #f97316 0%, #fca5a5 100%)' }}></div></div>
            </div>
          </div>
        </div>

        {/* Right Column: Early Warning System */}
        <div className="card-v2" style={{ height: 'fit-content' }}>
          <h3 className="card-title">Early Warning Sistem</h3>
          
          <div className="warning-box warning-yellow">
            <div>
              <div className="warning-title">Lonjakan Penyakit ISPA</div>
              <div className="warning-desc">Di Kec. mangli</div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>Kunjungi &gt;</span>
          </div>

          <div className="warning-box warning-red">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: 'var(--danger)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>!</div>
              <div>
                <div className="warning-title">Status Waspada TBC</div>
                <div className="warning-desc">Di Kec. Patrang</div>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: 'var(--danger)' }}>Kunjungi &gt;</span>
          </div>

          <button className="btn-detail">Lihat Detail</button>
        </div>
      </div>
    </div>
  );
}