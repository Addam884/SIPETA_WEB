import { useEffect, useState } from "react";
import api from "../../services/api";
import WilayahMap from "../../components/wilayahMap";
import "../../styles/DataMaster.css";

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

  // State bantu untuk menampilkan teks alamat di UI saja
  const [alamatTampilan, setAlamatTampilan] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
      e.preventDefault(); // Mencegah form reload instan
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
          alert("Lokasi tidak ditemukan. Coba ketik lebih spesifik.");
        }
      } catch (error) {
        console.error("Gagal mencari lokasi:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    // VALIDASI FRONTEND
    if (!form.nama_wilayah) {
      alert("Nama wilayah wajib diisi");
      return;
    }

    // CEK DUPLIKAT (hanya saat tambah, bukan edit)
    const isDuplicate = data.some(
      (item) =>
        item.nama_wilayah.toLowerCase() ===
        form.nama_wilayah.toLowerCase()
    );

    if (isDuplicate && !editId) {
      alert("Wilayah sudah ada!");
      return;
    }

    try {
      const payload = {
        nama_wilayah: form.nama_wilayah,
        level: form.level || null,
        populasi_jumlah: form.populasi_jumlah
          ? parseInt(form.populasi_jumlah)
          : null,
        latitude,
        longitude,
      };

      if (editId) {
        await api.put(`/wilayah/${editId}`, payload);
        alert("Data berhasil diupdate");
      } else {
        await api.post("/wilayah", payload);
        alert("Data berhasil ditambahkan");
      }

      // RESET
      setShowModal(false);
      setEditId(null);
      setAlamatTampilan("");
      setForm({
        nama_wilayah: "",
        level: "",
        populasi_jumlah: "",
      });
      setLatitude(-8.1723);
      setLongitude(113.7001);

      getData();
    } catch (error: any) {
      console.error("ERROR:", error.response?.data);

      // HANDLE ERROR BACKEND (INI PENTING)
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        alert(firstError);
      } else {
        alert("Terjadi kesalahan saat menyimpan data");
      }
    }
  };

  /* =========================
     DELETE
  ========================= */
  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Yakin ingin hapus data?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/wilayah/${id}`);
      getData();
    } catch (error) {
      console.error(error);
    }
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
      {/* HEADER */}
      <div className="dk-card-header dm-header">
        <span className="dk-card-title">Data Wilayah</span>
        <div className="dk-header-right">
          <div className="dk-search-wrap">
            <input
              className="dk-search"
              type="text"
              placeholder="Cari wilayah..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearch(e.target.value);
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
                  <td colSpan={4} className="dk-empty-row">Tidak ada data</td>
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
                        <span>{item.populasi_jumlah}</span>
                      ) : (
                        <span className="dk-faskes-empty">-</span>
                      )}
                    </td>
                    <td>
                      <div className="dk-actions-icons">

                        <button className="dk-action-icon dk-action-edit" onClick={() => handleEdit(item)}>✏️</button>
                        <button className="dk-action-icon dk-action-delete" onClick={() => handleDelete(item.id)}>🗑️</button>
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
        <div className="dm-modal-overlay">
          <div className="dm-modal" style={{ position: "relative", maxWidth: "900px", width: "100%" }}>

            {/* TOMBOL SILANG DI POJOK KANAN ATAS MODAL */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                fontSize: "22px",
                cursor: "pointer",
                color: "#9ca3af",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#4b5563")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
            >
              ✕
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
                  style={{ width: "100%", marginTop: "10px", background: "#2563eb", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}
                >
                  {editId ? "Update Wilayah" : "Simpan Wilayah"}
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