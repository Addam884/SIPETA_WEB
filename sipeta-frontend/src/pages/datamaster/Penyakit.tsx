import { useEffect, useState } from "react";
import api from "../../services/api";
import "../../styles/Datamaster.css";

interface Penyakit {
  id: number;
  nama_penyakit: string;
  kode_icd: string;
  kategori: string;
  threshold_ews: number;
}

export default function Penyakit() {
  const [data, setData] = useState<Penyakit[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const getData = async () => {
    try {
      const response = await api.get("/penyakit");
      setData(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const filteredData = data.filter((item) =>
    item.nama_penyakit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dm-page">

      {/* HEADER */}
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

          <button className="dk-btn dk-btn-blue">
            + Tambah Data
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
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
                        {item.kode_icd}
                      </span>
                    </td>

                    <td className="dk-disease-name">
                      {item.nama_penyakit}
                    </td>

                    <td>{item.kategori}</td>

                    <td>
                      <span className="dk-badge dk-badge-dirawat">
                        {item.threshold_ews}
                      </span>
                    </td>

                    <td>
                      <div className="dk-actions-icons">
                        <button className="dk-action-icon dk-action-edit">
                          ✏️
                        </button>
                        <button className="dk-action-icon dk-action-delete">
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
    </div>
  );
}