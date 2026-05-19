import { useEffect, useState } from "react";
import api from "../../services/api";
import "../../styles/Datamaster.css";

interface Wilayah {
  id: number;
  nama_wilayah: string;
  level?: string;
  parent_id?: number | null;
}

export default function Wilayah() {
  const [data, setData] = useState<Wilayah[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

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

  const filteredData = data.filter((item) =>
    item.nama_wilayah.toLowerCase().includes(search.toLowerCase())
  );

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
                <th>NAMA WILAYAH</th>
                <th>LEVEL</th>
                <th>PARENT ID</th>
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
                      {item.nama_wilayah}
                    </td>

                    <td>
                      {item.level ? (
                        <span className="dk-badge dk-badge-sembuh">
                          {item.level}
                        </span>
                      ) : (
                        <span className="dk-faskes-empty">-</span>
                      )}
                    </td>

                    <td>
                      {item.parent_id ?? (
                        <span className="dk-faskes-empty">-</span>
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