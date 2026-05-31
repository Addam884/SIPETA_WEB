import { useEffect, useState } from "react";
import api from "../../services/api";
import "../../styles/DataMaster.css";

/* ==========================================================================
   TYPE INTERFACE (Sesuai dengan skema pgAdmin Anda)
   ========================================================================== */
interface Penyakit {
  id: number;
  nama_penyakit: string;
  kode_icd: string;
  kategori: string;
  threshold_ews: number;
}

export default function Penyakit() {
  /* ==========================================================================
     STATES MANAGEMENT
     ========================================================================== */
  const [data, setData] = useState<Penyakit[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  // Kontrol Modal & Edit ID
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // State Form Input Penyakit (Menggunakan threshold_ews agar sinkron dengan database)
  const [form, setForm] = useState({
    kode_icd: "",
    nama_penyakit: "",
    kategori: "",
    threshold_ews: 100,
  });

  /* ==========================================================================
     API INTEGRATION (READ - GET DATA)
     ========================================================================== */
  const getData = async () => {
    try {
      const response = await api.get("/penyakit");
      setData(response.data);
    } catch (error) {
      console.error("Gagal mengambil data penyakit:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  /* ==========================================================================
     SEARCH FILTERING (Berdasarkan Nama Penyakit)
     ========================================================================== */
  const filteredData = data.filter((item) =>
    item.nama_penyakit.toLowerCase().includes(search.toLowerCase())
  );

  /* ==========================================================================
     API INTEGRATION (CREATE & UPDATE - SUBMIT)
     ========================================================================== */
  const handleSubmit = async () => {
    // Validasi dasar agar input wajib tidak kosong
    if (!form.nama_penyakit) {
      alert("Nama Penyakit wajib diisi!");
      return;
    }

    try {
      // Menyusun data payload tepat seperti kriteria backend Laravel Anda
      const payload = {
        nama_penyakit: form.nama_penyakit,
        kode_icd: form.kode_icd ? form.kode_icd.toUpperCase().trim() : null,
        kategori: form.kategori || null,
        threshold_ews: form.threshold_ews,
      };

      if (editId) {
        // Jalankan proses update data (PUT)
        await api.put(`/penyakit/${editId}`, payload);
      } else {
        // Jalankan proses tambah data baru (POST)
        await api.post("/penyakit", payload);
      }

      // Reset & Tutup Modal setelah data masuk ke PostgreSQL
      setShowModal(false);
      setEditId(null);
      setForm({
        kode_icd: "",
        nama_penyakit: "",
        kategori: "",
        threshold_ews: 100,
      });

      // Refresh isi tabel secara dinamis
      getData();
      alert("Data penyakit berhasil disimpan!");
    } catch (error) {
      console.error("Gagal menyimpan data penyakit:", error);
      alert("Terjadi masalah pada server (Error 500). Pastikan backend Laravel Anda sudah diperbarui.");
    }
  };

  /* ==========================================================================
     API INTEGRATION (DELETE DATA)
     ========================================================================== */
  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Apakah Anda yakin ingin menghapus data penyakit ini?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/penyakit/${id}`);
      getData();
    } catch (error) {
      console.error("Gagal menghapus data:", error);
    }
  };

  /* ==========================================================================
     TRIGGER EDIT MODAL
     ========================================================================== */
  const handleEdit = (item: Penyakit) => {
    setEditId(item.id);
    setForm({
      kode_icd: item.kode_icd || "",
      nama_penyakit: item.nama_penyakit,
      kategori: item.kategori || "",
      threshold_ews: item.threshold_ews || 100,
    });
    setShowModal(true);
  };

  return (
    <div className="dm-page">

      {/* HEADER SECTION (Pencarian & Tombol Trigger Modal) */}
      <div className="dk-card-header dm-header">
        <span className="dk-card-title">Data Penyakit</span>

        <div className="dk-header-right">
          <div className="dk-search-wrap">
            <input
              className="dk-search"
              type="text"
              placeholder="Cari penyakit..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
              setEditId(null);
              setForm({
                kode_icd: "",
                nama_penyakit: "",
                kategori: "",
                threshold_ews: 100,
              });
              setShowModal(true);
            }}
          >
            + Tambah Data
          </button>
        </div>
      </div>

      {/* TABLE DATA SECTION */}
      <div className="dk-card">
        <div className="dk-table-wrap">
          <table className="dk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>KODE ICD</th>
                <th>NAMA PENYAKIT</th>
                <th>KATEGORI</th>
                <th>THRESHOLD</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dk-empty-row">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="dk-cell-num">{index + 1}</td>

                    <td>
                      <span className="dk-badge dk-badge-sembuh">
                        {item.kode_icd || "-"}
                      </span>
                    </td>

                    <td className="dk-disease-name">
                      {item.nama_penyakit}
                    </td>

                    <td>{item.kategori || "-"}</td>

                    <td>
                      <span className="dk-badge dk-badge-dirawat">
                        {item.threshold_ews}
                      </span>
                    </td>

                    <td>
                      <div className="dk-actions-icons">
                        <button 
                          className="dk-action-icon dk-action-edit"
                          onClick={() => handleEdit(item)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="dk-action-icon dk-action-delete"
                          onClick={() => handleDelete(item.id)}
                        >
                          🗑️
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

      {/* MODAL SYSTEM (GRID: FORM INPUT & LIVE PREVIEW) */}
      {showModal && (
        <div className="dm-modal-overlay">
          <div className="dm-modal" style={{ position: "relative", maxWidth: "900px", width: "100%" }}>
            
            {/* TOMBOL CLOSE (✕) */}
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

            <h3 style={{ marginBottom: "24px", fontSize: "26px", fontWeight: 700 }}>
              {editId ? "Edit Data Penyakit" : "Tambah Data Penyakit"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px", alignItems: "start" }}>
              
              {/* PANEL KIRI: FORM INPUT */}
              <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                
                {/* INPUT KODE ICD-10 */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Kode ICD-10
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: a90, b20, j06.9"
                    value={form.kode_icd}
                    onChange={(e) => setForm({ ...form, kode_icd: e.target.value })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  />
                </div>

                {/* INPUT NAMA PENYAKIT */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Nama Penyakit
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama penyakit"
                    value={form.nama_penyakit}
                    onChange={(e) => setForm({ ...form, nama_penyakit: e.target.value })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  />
                </div>

                {/* DROPDOWN SELECT KATEGORI */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Kategori Penyakit
                  </label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px", background: "#fff" }}
                  >
                    <option value="">Pilih Kategori</option>
                    <option value="Menular">Menular</option>
                    <option value="Tidak Menular">Tidak Menular</option>
                  </select>
                </div>

                {/* INPUT THRESHOLD EWS */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
                    Threshold EWS (Batas Kritis Wabah)
                  </label>
                  <input
                    type="number"
                    value={form.threshold_ews}
                    onChange={(e) => setForm({ ...form, threshold_ews: parseInt(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px" }}
                  />
                </div>

                {/* TOMBOL SIMPAN DATA */}
                <button
                  onClick={handleSubmit}
                  style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}
                >
                  {editId ? "Update Data" : "Simpan Data"}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  style={{ width: "100%", marginTop: "10px", background: "#e5e7eb", color: "#111827", border: "none", padding: "14px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}
                >
                  Batal
                </button>
              </div>

              {/* PANEL KANAN: LIVE VISUAL PREVIEW CARD */}
              <div
                style={{
                  height: "100%",
                  minHeight: "410px",
                  background: "#f8fafc",
                  borderRadius: "20px",
                  padding: "30px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", color: "#1e293b", fontSize: "18px", fontWeight: 700 }}>
                  Pratinjau Kartu Informasi
                </h4>
                <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "24px" }}>
                  Tampilan visual di bawah ini merepresentasikan struktur data sistem manajemen surveilans kesehatan (SIPETA).
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "4px" }}>STANDAR KODE ICD-10</span>
                    <span style={{ display: "inline-block", background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: 700 }}>
                      {form.kode_icd.toUpperCase() || "BELUM DIISI"}
                    </span>
                  </div>

                  <div style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "2px" }}>NAMA PENYAKIT</span>
                    <strong style={{ fontSize: "16px", color: "#1e293b" }}>
                      {form.nama_penyakit || "Menunggu Input..."}
                    </strong>
                  </div>

                  <div style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "2px" }}>KATEGORI TRANSMISI</span>
                    <span style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>
                      {form.kategori || "Belum Dipilih"}
                    </span>
                  </div>

                  <div style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "2px" }}>AMBANG BATAS EARLY WARNING SYSTEM (EWS)</span>
                    <strong style={{ fontSize: "15px", color: "#dc2626" }}>
                      {form.threshold_ews} Kasus Terdeteksi
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}