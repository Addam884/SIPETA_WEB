import { useState } from "react";
import "../styles/Datakasus.css";

type DataKasus = {
  id: number;
  penyakit: string;
  tanggal: string;
  status: "Dirawat" | "Sembuh" | "Meninggal" | "Inactive";
  usia: number;
  jk: "L" | "P";
  kecamatan: string;
};

const dummyData: DataKasus[] = [
  { id: 1, penyakit: "ISPA", tanggal: "2025-01-01", status: "Dirawat", usia: 18, jk: "L", kecamatan: "Patrang" },
  { id: 2, penyakit: "TBC", tanggal: "2025-01-02", status: "Sembuh", usia: 19, jk: "P", kecamatan: "Patrang" },
];

export default function DataKasusPage() {
  const [data, setData] = useState<DataKasus[]>(dummyData);
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="data-kasus">
      <div className="data-kasus__header">
        <h2>Data Kasus</h2>
        <button onClick={() => setOpenModal(true)} className="btn-primary">
          Tambah Data
        </button>
      </div>

      <table className="data-table">
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
          {data.map((item, i) => (
            <tr key={item.id}>
              <td>{i + 1}</td>
              <td>{item.penyakit}</td>
              <td>{item.tanggal}</td>
              <td>
                <span className={`badge ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </td>
              <td>{item.usia}</td>
              <td>{item.jk}</td>
              <td>{item.kecamatan}</td>
              <td>
                <button className="btn-sm">Edit</button>
                <button className="btn-sm danger">Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openModal && (
        <TambahDataModal onClose={() => setOpenModal(false)} />
      )}
    </div>
  );

  type Props = {
  onClose: () => void;
};

function TambahDataModal({ onClose }: Props) {
  const [preview, setPreview] = useState<any[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // sementara dummy preview
    setPreview([
      { penyakit: "ISPA", usia: 18, status: "Dirawat" },
      { penyakit: "TBC", usia: 19, status: "Sembuh" },
    ]);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Tambah Data Kasus</h3>

        {/* FORM */}
        <div className="form-grid">
          <input placeholder="Penyakit" />
          <input placeholder="Usia" />
          <input placeholder="Status" />
          <input placeholder="Tanggal" />
          <input placeholder="Jenis Kelamin" />
          <input placeholder="Kecamatan" />
          <input placeholder="Kode Penyakit" />
        </div>

        {/* UPLOAD */}
        <div className="upload-section">
          <input type="file" accept=".csv,.xlsx" onChange={handleFile} />
          <button className="btn-success">Upload Data</button>
        </div>

        {/* PREVIEW */}
        {preview.length > 0 && (
          <>
            <h4>Preview Data</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Penyakit</th>
                  <th>Status</th>
                  <th>Usia</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((item, i) => (
                  <tr key={i}>
                    <td>{item.penyakit}</td>
                    <td>{item.status}</td>
                    <td>{item.usia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="modal-footer">
          <button onClick={onClose}>Batal</button>
          <button className="btn-primary">Simpan Data</button>
        </div>
      </div>
    </div>
  );
}
}
