import React, { useState } from 'react';
import '../styles/Datakasus.css';

// Interface untuk tipe data kasus
interface Kasus {
  id: number;
  penyakit: string;
  kodePenyakit: string;
  tanggal: string;
  keterangan: string;
  status: 'Dirawat' | 'Sembuh' | 'Inactive' | 'Meninggal';
  usia: number;
  jk: 'L' | 'P';
  kecamatan: string;
}

// Data Dummy
const dummyData: Kasus[] = [
  { id: 1, penyakit: 'ISPA', kodePenyakit: '5684236526', tanggal: '2023-10-01', keterangan: 'Lorem ipsum dolor sit amet...', status: 'Dirawat', usia: 18, jk: 'L', kecamatan: 'Patrang' },
  { id: 2, penyakit: 'ISPA', kodePenyakit: '5684236527', tanggal: '2023-10-02', keterangan: 'Lorem ipsum dolor sit amet...', status: 'Sembuh', usia: 19, jk: 'P', kecamatan: 'Patrang' },
  { id: 3, penyakit: 'TBC', kodePenyakit: '5684236528', tanggal: '2023-10-03', keterangan: 'Lorem ipsum dolor sit amet...', status: 'Dirawat', usia: 19, jk: 'L', kecamatan: 'Patrang' },
  { id: 4, penyakit: 'DBD', kodePenyakit: '5684236532', tanggal: '2023-10-04', keterangan: 'Lorem ipsum dolor sit amet...', status: 'Meninggal', usia: 19, jk: 'P', kecamatan: 'Patrang' },
];

const Datakasus: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedKasus, setSelectedKasus] = useState<Kasus | null>(null);

  // Helper untuk warna status
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Dirawat': return 'status-dirawat';
      case 'Sembuh': return 'status-sembuh';
      case 'Inactive': return 'status-inactive';
      case 'Meninggal': return 'status-meninggal';
      default: return '';
    }
  };

  const handleEditClick = (kasus: Kasus) => {
    setSelectedKasus(kasus);
    setIsEditModalOpen(true);
  };

  return (
    <div className="data-kasus-container">

      <div className="filters-container">
        <select className="filter-select"><option>Timeframe: All-time</option></select>
        <select className="filter-select"><option>Penyakit: All</option></select>
        <select className="filter-select"><option>Topic: All</option></select>
      </div>

      <div className="table-card">
        <div className="table-header-actions">
          <h3>Tabel Data Kasus</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="Search..." className="search-box" />
            <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>Tambah Data</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Penyakit</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th>Usia</th>
              <th>JK</th>
              <th>Kecamatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {dummyData.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>
                  <strong>{row.penyakit}</strong><br />
                  <span style={{ fontSize: '12px', color: '#888' }}>{row.kodePenyakit}</span>
                </td>
                <td>
                  {row.tanggal}<br />
                  <span style={{ fontSize: '12px', color: '#888' }}>{row.keterangan.substring(0, 30)}...</span>
                </td>
                <td><span className={`status-badge ${getStatusClass(row.status)}`}>{row.status}</span></td>
                <td>{row.usia} thn</td>
                <td style={{ color: row.jk === 'L' ? '#ef4444' : '#22c55e' }}>{row.jk}</td>
                <td>{row.kecamatan}</td>
                <td>
                  <button className="btn-outline" onClick={() => handleEditClick(row)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL TAMBAH DATA */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tambah Data Kasus</h3>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>&times;</button>
            </div>
            
            <div className="form-grid">
              <div className="form-group"><label>Penyakit</label><input type="text" /></div>
              <div className="form-group"><label>Usia</label><input type="number" /></div>
              <div className="form-group"><label>Status</label>
                <select><option>Dirawat</option><option>Sembuh</option><option>Meninggal</option></select>
              </div>
              <div className="form-group"><label>Tanggal</label><input type="date" /></div>
              <div className="form-group"><label>Jenis Kelamin</label>
                <select><option>L</option><option>P</option></select>
              </div>
              <div className="form-group"><label>Kecamatan</label><input type="text" /></div>
              <div className="form-group"><label>Kode Penyakit</label><input type="text" /></div>
            </div>

            <div className="modal-actions-row">
              <button className="btn-primary">Tambah Data Manual</button>
            </div>

            <div className="info-note">
              Note : Unggah file berformat CSV atau Excel (.xlsx) yang berisi data kasus penyakit sesuai template. Pastikan kolom meliputi tanggal_kasus, penyakit, wilayah, umur, dll.
            </div>

            <div className="modal-actions-row">
              <label className="btn-success" style={{ cursor: 'pointer' }}>
                Upload Data CSV/Excel
                <input type="file" accept=".csv, .xlsx" style={{ display: 'none' }} />
              </label>
            </div>

            <h4 style={{ marginTop: '20px' }}>Preview Data Upload</h4>
            <div className="table-card" style={{ marginTop: '10px', padding: '10px' }}>
               {/* Reusable table layout for preview */}
               <table style={{ fontSize: '13px' }}>
                  <thead>
                    <tr><th>Penyakit</th><th>Tanggal</th><th>Status</th><th>Usia</th><th>JK</th></tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>Belum ada data yang diunggah</td></tr>
                  </tbody>
               </table>
            </div>

            <div className="modal-actions-row" style={{ marginTop: '20px' }}>
              <button className="btn-primary">Simpan Semua Data</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA */}
      {isEditModalOpen && selectedKasus && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Edit Data Kasus</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            </div>
            
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label>Penyakit</label>
                <input type="text" defaultValue={selectedKasus.penyakit} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select defaultValue={selectedKasus.status}>
                  <option>Dirawat</option><option>Sembuh</option>
                  <option>Inactive</option><option>Meninggal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Usia</label>
                <input type="number" defaultValue={selectedKasus.usia} />
              </div>
              <div className="form-group">
                <label>Kecamatan</label>
                <input type="text" defaultValue={selectedKasus.kecamatan} />
              </div>
            </div>

            <div className="modal-actions-row" style={{ marginTop: '20px' }}>
              <button className="btn-outline" onClick={() => setIsEditModalOpen(false)}>Batal</button>
              <button className="btn-primary" onClick={() => setIsEditModalOpen(false)}>Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Datakasus;