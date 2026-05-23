import { useState } from "react";
import Penyakit from "../pages/datamaster/Penyakit";
import Wilayah from "../pages/datamaster/Wilayah";
import Faskes from "../pages/datamaster/Faskes";
import "../styles/DataMasterLayout.css";

export default function DataMasterLayout() {
  const [activeTab, setActiveTab] = useState<"penyakit" | "populasi" | "wilayah" | "faskes">("penyakit");

  const tabs = [
    { name: "Penyakit", path: "penyakit" },
    { name: "Populasi", path: "populasi" },
    { name: "Wilayah", path: "wilayah" },
    { name: "Faskes", path: "faskes" },
  ];

  const tabComponents: Record<string, React.ReactNode> = {
    penyakit: <Penyakit />,
    wilayah: <Wilayah />,
    populasi: (
      <div className="dm-empty">
        🚧 Populasi Page belum tersedia
      </div>
    ),
    faskes: <Faskes/>,
  };

  return (
    <div className="dm-wrapper">

      {/* HEADER */}
      <div className="dm-header">
        <div>
          <h1 className="dm-title">Master Data</h1>
          <p className="dm-subtitle">
            Kelola semua data referensi sistem
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="dm-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            className={`dm-tab ${activeTab === tab.path ? "active" : ""}`}
            onClick={() => setActiveTab(tab.path as typeof activeTab)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="dm-content">
        {tabComponents[activeTab]}
      </div>

    </div>
  );
}