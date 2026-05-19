import { useState } from "react";
import Penyakit from "../pages/datamaster/Penyakit";
import Wilayah from "../pages/datamaster/Wilayah";
import Faskes from "../pages/datamaster/Faskes";
import "../styles/DataMasterLayout.css";

export default function DataMasterLayout() {
  const [activeTab, setActiveTab] = useState<"penyakit" | "wilayah" | "faskes">("penyakit");

  const tabs = [
    { name: "Penyakit", path: "penyakit" },
    { name: "Wilayah", path: "wilayah" },
    { name: "Faskes", path: "faskes" },
  ];

  const tabComponents: Record<string, React.ReactNode> = {
    penyakit: <Penyakit />,
    wilayah: <Wilayah />,
    faskes: <Faskes/>,
  };

  return (
    <div className="dm-wrapper">

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