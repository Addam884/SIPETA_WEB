import { useEffect, useState } from "react";
import api from "../../services/api";
import WilayahMap from "../../components/wilayahMap";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/Dialog";
import "../../styles/DataMaster.css";
import "../../styles/Toast.css";

/* =========================
   TYPES
========================= */
interface Wilayah {
  id: number;
  nama_wilayah: string;
  level?: string;
  populasi_jumlah?: number;
}

/* =========================
   COMPONENT
========================= */
export default function Wilayah() {
  /* =========================
     STATES
  ========================= */
  const [data, setData] = useState<Wilayah[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [latitude, setLatitude] = useState(-8.1723);
  const [longitude, setLongitude] = useState(113.7001);
  const [saving, setSaving] = useState(false);

  // State bantu untuk menampilkan teks alamat di UI saja
  const [alamatTampilan, setAlamatTampilan] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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

  /* =========================
     FORM
  ========================= */
  const [form, setForm] = useState({
    nama_wilayah: "",
    level: "",
    populasi_jumlah: "",
  });

  /* =========================
     GET DATA
  ========================= */
  const getData = async () => {
    try {
      const response = await api.get("/wilayah");
      setData(response.data);
    } catch (error) {
      console.error(error);
      showToast("Gagal memuat data wilayah", "error");
    }
  };

  useEffect(() => {
    getData();
  }, []);

  /* =========================
     FILTER
  ========================= */
  const filteredData = data.filter((item) =>
    item.nama_wilayah.toLowerCase().includes(search.toLowerCase())
  );

  /* =========================
     GEOCODING (SEARCH ON ENTER)
  ========================= */
  const handleKeyDownSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!form.nama_wilayah) return;

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.nama_wilayah)}&limit=1`
        );
        const resData = await response.json();

        if (resData && resData.length > 0) {
          const targetLat = parseFloat(resData[0].lat);
          const targetLng = parseFloat(resData[0].lon);

          setLatitude(targetLat);
          setLongitude(targetLng);
          setAlamatTampilan(resData[0].display_name);
        } else {
          showToast("Lokasi tidak ditemukan. Coba ketik lebih spesifik.", "warning");
        }
      } catch (error) {
        console.error("Gagal mencari lokasi:", error);
        showToast("Gagal mencari lokasi", "error");
      } finally {
        setIsSearching(false);
      }
    }
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!form.nama_wilayah) {
      showToast("Nama wilayah wajib diisi", "warning");
      return;
    }

    if (!form.level) {
      showToast("Level wilayah wajib dipilih", "warning");
      return;
    }

    setSaving(true);

    // Cek ketersediaan geom dulu
    try {
      const checkResponse = await api.get('/wilayah/check-geom', {
        params: {
          nama_wilayah: form.nama_wilayah,
          level: form.level
        }
      });

      if (!checkResponse.data.found) {
        showToast(`Wilayah "${form.nama_wilayah}" dengan level "${form.level}" tidak ditemukan di database batas wilayah!`, "error");
        setSaving(false);
        return;
      }

      // Lanjut simpan
      const payload = {
        nama_wilayah: form.nama_wilayah,
        level: form.level,
        populasi_jumlah: form.populasi_jumlah ? parseInt(form.populasi_jumlah) : null,
      };

      if (editId) {
        await api.put(`/wilayah/${editId}`, payload);
        showToast("Data wilayah berhasil diupdate", "success");
      } else {
        await api.post("/wilayah", payload);
        showToast("Data wilayah berhasil ditambahkan", "success");
      }

      // Reset form
      setShowModal(false);
      setEditId(null);
      setForm({ nama_wilayah: "", level: "", populasi_jumlah: "" });
      getData();

    } catch (error: any) {
      if (error.response?.data?.message) {
        showToast(error.response.data.message, "error");
      } else {
        showToast("Terjadi kesalahan saat menyimpan data", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, namaWilayah: string) => {
    showConfirm(
      `Hapus wilayah "${namaWilayah}" secara permanen?\n\n⚠️ PERINGATAN: Semua data terkait (populasi, kasus, faskes, dan hasil clustering) juga akan ikut terhapus!\n\nTindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          const response = await api.delete(`/wilayah/${id}`);
          if (response.data.success) {
            showToast(response.data.message || "Data wilayah berhasil dihapus", "success");
            getData(); // Refresh data
          }
        } catch (error: any) {
          console.error(error);
          const errorMsg = error.response?.data?.message || "Terjadi kesalahan saat menghapus data";
          showToast(errorMsg, "error");
        } finally {
          setConfirm(prev => ({ ...prev, open: false }));
        }
      },
      'danger'
    );
  };

  /* =========================
     EDIT
  ========================= */
  const handleEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      nama_wilayah: item.nama_wilayah,
      level: item.level || "",
      populasi_jumlah: item.populasi_jumlah !== undefined && item.populasi_jumlah !== null ? String(item.populasi_jumlah) : "",
    });

    // Jika data lama memiliki koordinat bawaan, pasang ke map
    if (item.latitude && item.longitude) {
      setLatitude(parseFloat(item.latitude));
      setLongitude(parseFloat(item.longitude));
      setAlamatTampilan("Lokasi koordinat tersimpan.");
    }

    setShowModal(true);
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

      {/* HEADER */}
      <div className="dk-card-header dm-header">
        <span className="dk-card-title">Data Wilayah</span>
        <div className="dk-header-right">
          <div className="dk-search-wrap">
            <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="dk-search"
              type="text"
              placeholder="Cari wilayah... (Enter)"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === "") setSearch("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                }
              }}
            />
          </div>

          <button
            className="dk-btn dk-btn-blue"
            onClick={() => {
              setShowModal(true);
              setEditId(null);
              setAlamatTampilan("");
              setLatitude(-8.1723);
              setLongitude(113.7001);
              setForm({ nama_wilayah: "", level: "", populasi_jumlah: "" });
            }}
          >
            + Tambah Data
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="dk-card">
        <div className="dk-table-wrap">
          <table className="dk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>NAMA WILAYAH</th>
                <th>LEVEL</th>
                <th>POPULASI</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dk-empty-row">Tidak ada data</td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="dk-cell-num">{index + 1}</td>
                    <td className="dk-disease-name">{item.nama_wilayah}</td>
                    <td>
                      {item.level ? (
                        <span className="dk-badge dk-badge-sembuh">{item.level}</span>
                      ) : (
                        <span className="dk-faskes-empty">-</span>
                      )}
                    </td>
                    <td>
                      {item.populasi_jumlah !== undefined && item.populasi_jumlah !== null ? (
                        <span>{item.populasi_jumlah.toLocaleString()}</span>
                      ) : (
                        <span className="dk-faskes-empty">-</span>
                      )}
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
                          onClick={() => handleDelete(item.id, item.nama_wilayah)}
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

      {/* MODAL */}
      {showModal && (
        <div className="dm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="dm-modal" style={{ position: "relative", maxWidth: "900px", width: "100%" }}>

            {/* TOMBOL SILANG DI POJOK KANAN ATAS MODAL */}
            <button
              onClick={() => setShowModal(false)}
              className="dk-close-btn"
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                fontSize: "22px",
                cursor: "pointer",
                color: "#9ca3af"
              }}
            >
              ×
            </button>

            {/* TITLE */}
            <h3 style={{ marginBottom: "24px", fontSize: "26px", fontWeight: 700 }}>
              {editId ? "Edit Wilayah" : "Tambah Wilayah"}
            </h3>

            {/* GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" }}>

              {/* LEFT PANEL */}
              <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

                {/* NAMA WILAYAH */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Nama Wilayah
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik wilayah lalu tekan ENTER..."
                    value={form.nama_wilayah}
                    onKeyDown={handleKeyDownSearch}
                    onChange={(e) => setForm({ ...form, nama_wilayah: e.target.value })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  />
                  <small style={{ color: "#9ca3af", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    {isSearching ? "Mencari lokasi..." : "Tekan 'Enter' untuk melacak ke peta"}
                  </small>
                </div>

                {/* LEVEL */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Level Wilayah
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px", background: "#fff" }}
                  >
                    <option value="">Pilih Level</option>
                    <option value="Provinsi">Provinsi</option>
                    <option value="Kecamatan">Kecamatan</option>
                    <option value="Kelurahan">Kelurahan</option>
                    <option value="Desa">Desa</option>
                  </select>
                </div>

                {/* POPULASI */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Populasi
                  </label>
                  <input
                    type="number"
                    placeholder="Misal 100"
                    value={form.populasi_jumlah}
                    onChange={(e) => setForm({ ...form, populasi_jumlah: e.target.value })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  />
                </div>

                {/* TAMPILAN ALAMAT SEBAGAI PENGGANTI LAT/LONG */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Alamat Terdeteksi
                  </label>
                  <textarea
                    rows={3}
                    readOnly
                    placeholder="Alamat otomatis terisi dari pencarian atau pin peta"
                    value={alamatTampilan}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      fontSize: "13px",
                      resize: "none",
                      outline: "none"
                    }}
                  />
                </div>

                {/* BUTTON ACTIONS */}
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{ width: "100%", marginTop: "10px", background: "#2563eb", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "15px", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Menyimpan..." : (editId ? "Update Wilayah" : "Simpan Wilayah")}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  style={{ width: "100%", marginTop: "10px", background: "#e5e7eb", color: "#111827", border: "none", padding: "14px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}
                >
                  Batal
                </button>
              </div>

              {/* RIGHT PANEL MAP */}
              <div>
                <WilayahMap
                  latitude={latitude}
                  longitude={longitude}
                  setLatitude={setLatitude}
                  setLongitude={setLongitude}
                  setAlamatTampilan={setAlamatTampilan}
                />
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}