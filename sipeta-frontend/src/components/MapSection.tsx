import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const jemberPosition: [number, number] = [-8.1724, 113.7000];

const riskZones = [
  { position: [-8.1724, 113.7000] as [number, number], radius: 3000, color: "#ef4444", label: "Jember Kota", risk: "Tinggi", cases: 312 },
  { position: [-8.2200, 113.6500] as [number, number], radius: 2500, color: "#f59e0b", label: "Ambulu", risk: "Sedang", cases: 187 },
  { position: [-8.1000, 113.7500] as [number, number], radius: 2000, color: "#22c55e", label: "Sempolan", risk: "Rendah", cases: 64 },
];

function MapSection() {
  return (
    <section className="map-section">

      <div className="section-header">
        <div className="section-tag">Peta Penyakit</div>
        <h2 className="section-title">Peta Penyebaran Penyakit</h2>
        <p className="section-sub">
          Visualisasi real-time penyebaran penyakit berdasarkan wilayah kecamatan
        </p>
      </div>

      <div className="map-layout">

  {/* MAP */}
  <div className="map-wrapper">
    <MapContainer
      center={jemberPosition}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {riskZones.map((zone, i) => (
        <>
          <Circle
            key={`circle-${i}`}
            center={zone.position}
            radius={zone.radius}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.2,
              weight: 2
            }}
          />

          <Marker key={`marker-${i}`} position={zone.position}>
            <Popup>
              <strong>{zone.label}</strong><br />
              Risiko: {zone.risk}<br />
              Kasus: {zone.cases}
            </Popup>
          </Marker>
        </>
      ))}

    </MapContainer>
  </div>


  {/* SIDEBAR */}
  <div className="map-sidebar">

    <div className="sidebar-card">
      <h3 className="sidebar-title">Legenda Risiko</h3>

      <div className="legend-list">

        <div className="legend-item">
          <div className="legend-dot" style={{ background: "#ef4444" }}></div>
          <div>
            <div className="legend-label">Zona Risiko Tinggi</div>
            <div className="legend-sub">≥ 200 kasus aktif</div>
          </div>
        </div>

        <div className="legend-item">
          <div className="legend-dot" style={{ background: "#f59e0b" }}></div>
          <div>
            <div className="legend-label">Zona Risiko Sedang</div>
            <div className="legend-sub">100–199 kasus aktif</div>
          </div>
        </div>

        <div className="legend-item">
          <div className="legend-dot" style={{ background: "#22c55e" }}></div>
          <div>
            <div className="legend-label">Zona Risiko Rendah</div>
            <div className="legend-sub">{'< 100 kasus aktif'}</div>
          </div>
        </div>

      </div>
    </div>


    <div className="sidebar-card">
      <h3 className="sidebar-title">Zona Panas</h3>

      {riskZones.map((z, i) => (
        <div className="hotspot-item" key={i}>

          <div
            className="hotspot-dot"
            style={{ background: z.color }}
          ></div>

          <div className="hotspot-info">
            <div className="hotspot-name">{z.label}</div>
            <div className="hotspot-cases">{z.cases} kasus</div>
          </div>

          <div
            className="hotspot-badge"
            style={{ color: z.color, borderColor: z.color }}
          >
            {z.risk}
          </div>

        </div>
      ))}

    </div>

    <button className="btn-fullmap">
      Buka Peta Penuh
    </button>

  </div>

</div>
    </section>
  );
}

export default MapSection;