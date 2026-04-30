import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import sipetaLogo from "../assets/logo.png";
import sipetaLogoIcon from "../assets/logo2.png";
import "../styles/DashboardLayout.css";

/*pagenya disini*/
import Datakasus from "../pages/datakasus.tsx";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import UserDashboard from "../pages/dashboard/UserDashboard";
import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";

/* ✅ TAMBAHAN ROLE */
export type Role = "user" | "admin" | "superadmin";

type DashboardLayoutProps = {
  role: Role;
};

type MenuKey = "dashboard" | "gis" | "datakasus" | "datamaster" | "settings";

type MenuItem = {
  key: MenuKey;
  label: string;
  icon: ReactNode;
};

const roleMenus: Record<Role, MenuKey[]> = {
  user: ["dashboard", "gis"],
  admin: ["dashboard", "gis", "datakasus", "settings"],
  superadmin: ["dashboard", "gis", "datakasus", "datamaster", "settings"],
};

const menuItems: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13.5 9 8l4 4 7-8" />
        <path d="M4 20h16" />
      </svg>
    ),
  },
  {
    key: "gis",
    label: "GIS",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    key: "datakasus",
    label: "Data Kasus",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
      <path d="M14 2v6h6"/>
      <path d="M8 13h8M8 17h8M8 9h4"/>
        </svg>
    ),
  },
  {
    key: "datamaster",
    label: "Data Master",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="7" ry="3"/>
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/>
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>
        </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 0 1-2.97 2.97l-.05-.05A1.8 1.8 0 0 0 14.8 19.6a1.8 1.8 0 0 0-1.1 1.65V21.4a2.1 2.1 0 0 1-4.2 0v-.15a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05A2.1 2.1 0 0 1 3.4 17.04l.05-.05A1.8 1.8 0 0 0 3.8 15a1.8 1.8 0 0 0-1.65-1.1H2a2.1 2.1 0 0 1 0-4.2h.15A1.8 1.8 0 0 0 3.8 8.6a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.1 2.1 0 0 1 6.36 3.6l.05.05A1.8 1.8 0 0 0 8.4 4a1.8 1.8 0 0 0 1.1-1.65V2.2a2.1 2.1 0 0 1 4.2 0v.15A1.8 1.8 0 0 0 14.8 4a1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 0 1 2.97 2.97l-.05.05A1.8 1.8 0 0 0 19.4 8.6a1.8 1.8 0 0 0 1.65 1.1h.15a2.1 2.1 0 0 1 0 4.2h-.15A1.8 1.8 0 0 0 19.4 15Z" />
      </svg>
    ),
  },
];

const pageDescriptions: Record<MenuKey, string> = {
  dashboard: "Ringkasan data surveilans penyakit menular.",
  gis: "Peta interaktif GIS.",
  settings: "Konfigurasi akun kalian disini.",
  datakasus: "Manajemen Data Kasus",
  datamaster: "Manajemen Data Master"
};

/* ✅ HANYA TAMBAH PROPS */
function DashboardLayout({ role: _role }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");

  /* ✅ OPTIONAL (tidak ubah UI, hanya logic) */
  const filteredMenu = menuItems.filter((item) =>
  roleMenus[_role].includes(item.key)
);

useEffect(() => {
  if (!roleMenus[_role].includes(activeMenu)) {
    setActiveMenu(roleMenus[_role][0]);
  }
}, [_role]);

  const activeItem =
    filteredMenu.find((item) => item.key === activeMenu) ??
    filteredMenu[0];

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsCollapsed((value) => !value);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  //aktifin child page disini//
  const pageMap: Record<MenuKey, ReactNode> = {
  dashboard:
    _role === "admin" ? <AdminDashboard /> :
    _role === "superadmin" ? <SuperAdminDashboard /> :
    <UserDashboard />,

  gis: <div>GIS Page</div>,
  datakasus: <Datakasus />,
  datamaster: <div>Data Master Page</div>,
  settings: <div>Settings Page</div>,
};

  return (
    <div className={`dashboard-shell${isCollapsed ? " dashboard-shell--collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__top">
          <div className="dashboard-logo" title="SIPETA">
            <img src={sipetaLogo} alt="SIPETA" />
          </div>

          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-tooltip={
              isCollapsed
                ? "Expand sidebar (Ctrl + B)"
                : "Collapse sidebar (Ctrl + B)"
            }
          >
            <span className="sidebar-toggle__logo">
              <img src={sipetaLogoIcon} alt="SIPETA" />
            </span>

            <span className="sidebar-toggle__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M9 5v14" />
              </svg>
            </span>
          </button>
        </div>

        <nav className="dashboard-menu" aria-label="Menu dashboard SIPETA">
          {filteredMenu.map((item) => (
            <button
              className={`dashboard-menu__item${activeMenu === item.key ? " dashboard-menu__item--active" : ""}`}
              key={item.key}
              type="button"
              onClick={() => setActiveMenu(item.key)}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="dashboard-menu__icon">{item.icon}</span>
              <span className="dashboard-menu__label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{activeItem.label}</h1>
            <p>{pageDescriptions[activeItem.key]}</p>
          </div>

          <div className="dashboard-header__right">
            <button className="header-action" type="button">
              Export
            </button>
            <div className="dashboard-profile" aria-label="Profil pengguna">
              <img src="https://i.pravatar.cc/96?img=12" alt="Profil pengguna SIPETA" />
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          {pageMap[activeMenu]}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;