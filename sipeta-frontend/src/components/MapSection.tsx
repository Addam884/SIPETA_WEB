import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import api from "../services/api";
import "leaflet/dist/leaflet.css";

// 🔥 FIX ICON TS
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// 🔥 CUSTOM FASKES ICON (Class CSS digunakan di sini)
const faskesIcon = (active = false) => L.divIcon({
  className: 'custom-faskes-wrapper',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:${active ? '#185FA5' : '#fff'};
    border:2.5px solid #185FA5;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${active ? '#fff' : '#185FA5'}" stroke-width="2.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// 🔥 CENTER
const jemberPosition: [number, number] = [-8.1724, 113.7000];

// 🔥 AUTO FIT
function FitBounds({ geojson }: { geojson: any }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson) return;

    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geojson, map]);

  return null;
}

function MapSection() {
  const [geojson, setGeojson] = useState<any>(null);
  const [faskesGeo, setFaskesGeo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 State untuk melacak faskes mana yang sedang diklik
  const [selectedFaskesId, setSelectedFaskesId] = useState<number | null>(null);

  // 🔥 FETCH GEOJSON + FASKES
  useEffect(() => {
    Promise.all([
      api.get("/gis/geojson"),
      api.get("/gis/faskes")
    ])
      .then(([geoRes, faskesRes]) => {
        setGeojson(geoRes.data);
        setFaskesGeo(faskesRes.data);
      })
      .catch((err) => {
        console.error("ERROR GIS:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const zones = geojson?.features ?? [];

  return (
    <section className="map-section">

      {/* HEADER */}
      <div className="section-header">
        <div className="section-tag">Peta Penyakit</div>
        <h2 className="section-title">Peta Penyebaran Penyakit</h2>
        <p className="section-sub">
          Visualisasi real-time penyebaran penyakit dan fasilitas kesehatan
        </p>
      </div>

      <div className="map-layout">

        {/* MAP */}
        <div className="map-wrapper">

          {loading && (
            <div className="map-loading">
              Memuat peta...
            </div>
          )}

          <MapContainer
            center={jemberPosition}
            zoom={11}
            className="leaflet-map-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 🔥 FIT */}
            {geojson && <FitBounds geojson={geojson} />}

            {/* 🔥 POLYGON WILAYAH */}
            {geojson && (
              <GeoJSON
                data={geojson}
                style={(feature: any) => ({
                  fillColor: feature?.properties?.cluster_color ?? "#e5e7eb",
                  color: "#fff",
                  weight: 1,
                  fillOpacity: 0.7,
                })}
                onEachFeature={(feature: any, layer: any) => {
                  const p = feature.properties;

                  layer.bindPopup(`
                    <strong>${p.nama_wilayah}</strong><br/>
                    Kasus: ${p.jumlah_kasus}<br/>
                    Risiko: ${p.cluster_label}
                  `);
                }}
              />
            )}

            {/* 🔥 MARKER FASKES */}
            {faskesGeo?.features?.map((f: any, i: number) => {
              const coords = f.geometry.coordinates;
              const p = f.properties;
              
              // Buat variabel ID untuk mencegah repetisi
              const currentId = p.id ?? i;
              const isActive = selectedFaskesId === currentId;

              return (
                <Marker
                  key={currentId}
                  position={[coords[1], coords[0]]}
                  icon={faskesIcon(isActive)}
                  eventHandlers={{
                    click: () => {
                      setSelectedFaskesId(currentId);
                    },
                    popupclose: () => {
                      // 🔥 Reset state ke null HANYA jika marker ini yang tertutup
                      // Ini mencegah marker kembali putih jika user mengeklik langsung marker faskes lain
                      setSelectedFaskesId((prev) => (prev === currentId ? null : prev));
                    },
                  }}
                >
                  <Popup>
                    <strong>{p.nama_faskes}</strong><br />
                    Wilayah: {p.nama_wilayah}
                  </Popup>
                </Marker>
              );
            })}

          </MapContainer>
        </div>

        {/* SIDEBAR */}
        <div className="map-sidebar">

          {/* LEGEND */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Legenda Risiko</h3>

            <div className="legend-list">
              <div className="legend-item">
                <div className="legend-dot legend-high"></div>
                <div>
                  <div className="legend-label">Zona Risiko Tinggi</div>
                  <div className="legend-sub">Cluster Tinggi</div>
                </div>
              </div>

              <div className="legend-item">
                <div className="legend-dot legend-medium"></div>
                <div>
                  <div className="legend-label">Zona Risiko Sedang</div>
                  <div className="legend-sub">Cluster Sedang</div>
                </div>
              </div>

              <div className="legend-item">
                <div className="legend-dot legend-low"></div>
                <div>
                  <div className="legend-label">Zona Risiko Rendah</div>
                  <div className="legend-sub">Cluster Rendah</div>
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 HOTSPOT */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Zona Risiko</h3>

            {zones.length === 0 ? (
              <div className="empty-data-text">Tidak ada data</div>
            ) : (
              zones.map((z: any, i: number) => {
                const p = z.properties;

                return (
                  <div className="hotspot-item" key={i}>

                    {/* Background inline karena data dari API */}
                    <div
                      className="hotspot-dot"
                      style={{ background: p.cluster_color }}
                    ></div>

                    <div className="hotspot-info">
                      <div className="hotspot-name">{p.nama_wilayah}</div>
                      <div className="hotspot-cases">{p.jumlah_kasus} kasus</div>
                    </div>

                    {/* Warna dinamis API */}
                    <div
                      className="hotspot-badge"
                      style={{ color: p.cluster_color, borderColor: p.cluster_color }}
                    >
                      {p.cluster_label}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

export default MapSection;