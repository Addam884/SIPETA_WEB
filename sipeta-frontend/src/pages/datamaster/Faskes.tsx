import { useEffect, useState } from "react";
import api from "../../services/api";
import "../../styles/DataMaster.css";

interface Faskes {
  id: number;
  nama_faskes: string;
  wilayah_id: number;
  wilayah?: {
    nama_wilayah: string;
  };
  geom?: string;
}

export default function Faskes() {
  const [data, setData] = useState<Faskes[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const getData = async () => {
    try {
      const response = await api.get("/faskes", {
        params: {
          search: search || undefined,
        },
      });
      setData(response.data);
    } catch (error) {
      console.error("Gagal ambil data faskes:", error);
    }
  };

  useEffect(() => {
    getData();
  }, [search]);

  const filteredData = data.filter((item) =>
    item.nama_faskes.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dm-page">

      {/* HEADER */}
      <div className="dk-card-header dm-header">
        <span className="dk-card-title">Data Faskes</span>

        <div className="dk-header-right">
          <div className="dk-search-wrap">
            <input
              className="dk-search"
              type="text"
              placeholder="Cari faskes..."
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

      {/* TABLE */}
      <div className="dk-card">

        <div className="dk-table-wrap">
          <table className="dk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>NAMA FASKES</th>
                <th>WILAYAH</th>
                <th>GEOMETRI</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dk-empty-row">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="dk-cell-num">{index + 1}</td>

                    <td className="dk-disease-name">
                      {item.nama_faskes}
                    </td>

                    <td>
                      {item.wilayah?.nama_wilayah ?? "-"}
                    </td>

                    <td>
                      {item.geom ? (
                        <span className="dk-badge dk-badge-sembuh">
                          ✓ Ada
                        </span>
                      ) : (
                        <span className="dk-badge dk-badge-inactive">
                          -
                        </span>
                      )}
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