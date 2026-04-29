import '../../styles/Dashboard.css';

export default function AdminDashboard() {
  return (
    <div>
      {/* Header & Filters */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>Grafik Tren Penyakit</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Penyakit v Month v</span>
            </div>
            
            {/* Mockup Bar Chart */}
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
              {[30, 45, 45, 75, 85, 60, 30, 85, 100, 110, 120].map((h, i) => (
                <div key={i} style={{ width: '100%', backgroundColor: '#3b82f6', height: `${h}px`, borderRadius: '4px 4px 0 0' }}></div>
              ))}
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