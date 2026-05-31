import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// FIX ICON
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  latitude: number;
  longitude: number;
  setLatitude: (value: number) => void;
  setLongitude: (value: number) => void;
  setAlamatTampilan: (value: string) => void;
}

// Komponen untuk mendeteksi klik pada peta & mengambil alamat (Reverse Geocoding)
function LocationMarker({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
  setAlamatTampilan,
}: Props) {
  useMapEvents({
    async click(e) {
      setLatitude(e.latlng.lat);
      setLongitude(e.latlng.lng);
      
      // Ambil data nama tempat berdasarkan titik klik peta
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`
        );
        const data = await response.json();
        if (data && data.display_name) {
          setAlamatTampilan(data.display_name);
        }
      } catch (err) {
        console.error("Gagal mengambil alamat: ", err);
      }
    },
  });

  return <Marker position={[latitude, longitude]} />;
}

// Komponen untuk otomatis menggeser kamera peta secara smooth
function ChangeMapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

export default function WilayahMap({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
  setAlamatTampilan,
}: Props) {
  return (
    <div
      style={{
        height: "500px",
        width: "100%",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker
          latitude={latitude}
          longitude={longitude}
          setLatitude={setLatitude}
          setLongitude={setLongitude}
          setAlamatTampilan={setAlamatTampilan}
        />

        <ChangeMapCenter lat={latitude} lng={longitude} />
      </MapContainer>
    </div>
  );
}