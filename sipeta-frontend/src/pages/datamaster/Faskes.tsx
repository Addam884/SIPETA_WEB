import { useEffect, useState } from "react";
import api from "../../services/api";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/Dialog";
import "../../styles/DataMaster.css";
import "../../styles/Toast.css";

// Fix React-Leaflet icon marker bug
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface WilayahOption {
  id: number;
  nama_wilayah: string;
}

interface FaskesData {
  id: number;
  nama_faskes: string;
  wilayah_id: number;
  wilayah?: {
    nama_wilayah: string;
  };
  latitude?: number | string;
  longitude?: number | string;
}

export default function Faskes() {
  const [data, setData] = useState<FaskesData[]>([]);
  const [wilayahOptions, setWilayahOptions] = useState<WilayahOption[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Dialog state
  interface ConfirmState {
    open: boolean;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, message: '', onConfirm: () => { } });

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'danger') => {
    setConfirm({ open: true, message, onConfirm, variant });
  };

  // Form State (Default Center Jember)
  const [form, setForm] = useState({
    nama_faskes: "",
    wilayah_id: "",
    latitude: -8.1723,
    longitude: 113.7001,
  });

  // Ambil data faskes dari API Backend
  const getData = async (keyword = "") => {
    try {
      const url = keyword ? `/faskes?search=${encodeURIComponent(keyword)}` : "/faskes";
      const response = await api.get(url);
      setData(response.data);
    } catch (error) {
      console.error("Gagal memuat data faskes:", error);
      showToast("Gagal memuat data faskes", "error");
    }
  };

  // Ambil list wilayah untuk dropdown select
  const getWilayahOptions = async () => {
    try {
      const response = await api.get("/wilayah");
      const dataWilayah = Array.isArray(response.data) ? response.data : response.data.data || [];
      setWilayahOptions(dataWilayah);
    } catch (error) {
      console.error("Gagal memuat list wilayah:", error);
    }
  };

  useEffect(() => {
    getData();
    getWilayahOptions();
  }, []);

  // Geocoding Otomatis Nominatim OpenStreetMap di dalam modal
  const handleSearchLocationInModal = async () => {
    if (!form.nama_faskes) return;
    try {
      const queryUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        form.nama_faskes + " Jember"
      )}&limit=1`;

      const response = await fetch(queryUrl);
      const result = await response.json();

      if (result && result.length > 0) {
        const lat = parseFloat(result[0].lat);
        const lng = parseFloat(result[0].lon);

        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
      } else {
        showToast("Lokasi faskes tidak ditemukan di OpenStreetMap. Silakan klik manual pada peta.", "warning");
      }
    } catch (error) {
      console.error("Gagal mencari koordinat otomatis:", error);
      showToast("Gagal mencari koordinat otomatis", "error");
    }
  };

  // Event handler saat peta diklik manual oleh user
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setForm((prev) => ({
          ...prev,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        }));
      },
    });
    return null;
  }

  // Penggerak kamera peta otomatis agar mengikuti isi koordinat state form
  function ChangeMapCenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
  }

  // Aksi Simpan Data (Tambah / Edit)
  const handleSubmit = async () => {
    if (!form.nama_faskes || !form.wilayah_id) {
      showToast("Nama Faskes dan Wilayah Terikat wajib diisi!", "warning");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nama_faskes: form.nama_faskes,
        wilayah_id: parseInt(form.wilayah_id, 10),
        latitude: parseFloat(form.latitude.toString()),
        longitude: parseFloat(form.longitude.toString()),
      };

      if (editId) {
        await api.put(`/faskes/${editId}`, payload);
        showToast("Data faskes berhasil diupdate", "success");
      } else {
        await api.post("/faskes", payload);
        showToast("Data faskes berhasil ditambahkan", "success");
      }

      setShowModal(false);
      setEditId(null);
      setForm({ nama_faskes: "", wilayah_id: "", latitude: -8.1723, longitude: 113.7001 });
      setSearchInput("");
      getData("");
    } catch (error: any) {
      console.error("Gagal menyimpan data:", error);
      const errorMsg = error.response?.data?.message || "Terjadi kesalahan saat menyimpan data.";
      showToast(`Error: ${errorMsg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Aksi Klik Tombol Edit ✏️
  const handleEdit = (item: FaskesData) => {
    setEditId(item.id);
    setForm({
      nama_faskes: item.nama_faskes,
      wilayah_id: item.wilayah_id.toString(),
      latitude: item.latitude ? parseFloat(item.latitude.toString()) : -8.1723,
      longitude: item.longitude ? parseFloat(item.longitude.toString()) : 113.7001,
    });
    setShowModal(true);
  };

  // Aksi Klik Tombol Hapus 🗑️
  const handleDelete = async (id: number, namaFaskes: string) => {
    showConfirm(
      `Hapus faskes "${namaFaskes}"? Data terkait kasus juga akan terhapus. Tindakan tidak dapat dibatalkan.`,
      async () => {
        try {
          const response = await api.delete(`/faskes/${id}`);
          showToast(response.data.message || "Data faskes berhasil dihapus!", "success");
          setSearchInput("");
          getData("");
        } catch (error: any) {
          console.error("Gagal menghapus faskes:", error);
          const errorMsg = error.response?.data?.message || "Gagal menghapus faskes.";
          showToast(`Error: ${errorMsg}`, "error");
        } finally {
          setConfirm(prev => ({ ...prev, open: false }));
        }
      },
      'danger'
    );
  };

  return (
    <div className="dm-page">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(prev => ({ ...prev, open: false }))}
        variant={confirm.variant}
      />

      {/* HEADER BAR */}
      <div className="dk-card-header dm-header">
        <span className="dk-card-title">Data Faskes</span>
        <div className="dk-header-right">
          <div className="dk-search-wrap">
            <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="dk-search"
              type="text"
              placeholder="Cari faskes lalu tekan Enter..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === "") {
                  getData("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  getData(searchInput);
                }
              }}
            />
          </div>
          <button 
            className="dk-btn dk-btn-blue"
            onClick={() => {
              setEditId(null);
              setForm({ nama_faskes: "", wilayah_id: "", latitude: -8.1723, longitude: 113.7001 });
              setShowModal(true);
            }}
          >
            + Tambah Data
          </button>
        </div>
      </div>

      {/* DATA MASTER TABLE */}
      <div className="dk-card">
        <div className="dk-table-wrap">
          <table className="dk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>NAMA FASKES</th>
                <th>WILAYAH</th>
                <th>GEOMETRI (LAT, LNG)</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dk-empty-row">Tidak ada data faskes ditemukan</td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id}>
                    <td className="dk-cell-num">{index + 1}</td>
                    <td className="dk-disease-name">{item.nama_faskes}</td>
                    <td>{item.wilayah?.nama_wilayah ?? "-"}</td>
                    <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>
                      {item.latitude && item.longitude 
                        ? `${parseFloat(item.latitude.toString()).toFixed(5)}, ${parseFloat(item.longitude.toString()).toFixed(5)}`
                        : "-"}
                    </td>
                    <td>
                      <div className="dk-actions-icons">
                        <button 
                          className="dk-action-icon dk-action-edit" 
                          onClick={() => handleEdit(item)}
                          title="Edit data"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3l4 4-7 7H10v-4l7-7z" />
                            <path d="M4 20h16" />
                          </svg>
                        </button>
                        <button 
                          className="dk-action-icon dk-action-delete" 
                          onClick={() => handleDelete(item.id, item.nama_faskes)}
                          title="Hapus data"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13" />
                            <path d="M9 3h6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP FORM MODAL CONTAINER */}
      {showModal && (
        <div className="dm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="dm-modal" style={{ maxWidth: "900px", width: "100%", padding: "32px", borderRadius: "24px", position: "relative" }}>
            <button 
              onClick={() => setShowModal(false)}
              className="dk-close-btn"
              style={{ position: "absolute", top: "24px", right: "24px", background: "transparent", border: "none", fontSize: "22px", cursor: "pointer", color: "#9ca3af" }}
            >
              ×
            </button>

            <h3 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 700, color: "#1e293b" }}>
              {editId ? "Ubah Fasilitas Kesehatan" : "Registrasi Fasilitas Kesehatan Baru"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* KOLOM KIRI: INPUT FORM DATA */}
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, color: "#4b5563" }}>Nama Fasilitas Kesehatan</label>
                  <input
                    type="text"
                    placeholder="Contoh: puskesmas kalisat (Lalu tekan Enter)"
                    value={form.nama_faskes}
                    onChange={(e) => setForm({ ...form, nama_faskes: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchLocationInModal();
                      }
                    }}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    *Ketik nama puskesmas lalu tekan <b>Enter</b> untuk memindahkan titik maps otomatis.
                  </small>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, color: "#4b5563" }}>Wilayah Terikat</label>
                  <select
                    value={form.wilayah_id}
                    onChange={(e) => setForm({ ...form, wilayah_id: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff" }}
                  >
                    <option value="">Pilih Hubungan Wilayah</option>
                    {wilayahOptions.map((w) => (
                      <option key={w.id} value={w.id}>{w.nama_wilayah}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Lintang (Lat):</span>
                    <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "2px" }}>{parseFloat(form.latitude.toString()).toFixed(6)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Garis Bujur (Lng):</span>
                    <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "2px" }}>{parseFloat(form.longitude.toString()).toFixed(6)}</div>
                  </div>
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={saving}
                  style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", marginBottom: "10px", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
                <button onClick={() => setShowModal(false)} style={{ width: "100%", background: "#f3f4f6", color: "#1f2937", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
                  Batal
                </button>
              </div>

              {/* KOLOM KANAN: MAPS REAKTIF */}
              <div style={{ height: "380px", borderRadius: "16px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <MapContainer
                  center={[parseFloat(form.latitude.toString()), parseFloat(form.longitude.toString())]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler />
                  <ChangeMapCenter center={[parseFloat(form.latitude.toString()), parseFloat(form.longitude.toString())]} />
                  <Marker position={[parseFloat(form.latitude.toString()), parseFloat(form.longitude.toString())]} />
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}