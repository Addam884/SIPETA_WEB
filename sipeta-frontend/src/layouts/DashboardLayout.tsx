import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import sipetaLogo from "../assets/logo.png";
import sipetaLogoIcon from "../assets/logo2.png";
import "../styles/DashboardLayout.css";

import { useAuth } from "../context/AuthContext";

export type Role = "user" | "admin" | "superadmin";

type DashboardLayoutProps = {
  role: Role;
};

type MenuKey = "dashboard" | "gis" | "datakasus" | "datamaster" | "settings" | "riwayat";

type MenuItem = {
  key: MenuKey;
  label: string;
  icon: ReactNode;
};

const roleMenus: Record<Role, MenuKey[]> = {
  user: ["dashboard", "gis", "settings"],
  admin: ["dashboard", "gis", "datakasus", "settings"],
  superadmin: ["dashboard", "gis", "datakasus", "datamaster", "riwayat", "settings"],
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
        <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8M8 9h4" />
      </svg>
    ),
  },
  {
    key: "datamaster",
    label: "Data Master",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    ),
  },
  {
    key: "riwayat",
    label: "Riwayat",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
      d="M12 8v5l3 2"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 12a9 9 0 1 0 3-6.7"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 3v5h5"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
  datamaster: "Manajemen Data Master",
  riwayat: "Riwayat Aktivitas",
};

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Ambil base path dari segment pertama URL (misal: /admin, /user, /superadmin)
  const basePath = "/" + location.pathname.split("/")[1];

  // Filter menu sesuai role
  const filteredMenu = menuItems.filter((item) =>
    roleMenus[role].includes(item.key)
  );

  // Tentukan active menu berdasarkan URL saat ini
  const getMenuFromPath = (pathname: string): MenuKey => {
    if (pathname.includes("/settings")) return "settings";
    if (pathname.includes("/datakasus")) return "datakasus";
    if (pathname.includes("/datamaster")) return "datamaster";
    if (pathname.includes("/gis")) return "gis";
    if (pathname.includes("/riwayat")) return "riwayat";
    return "dashboard";
  };

  const activeMenu = getMenuFromPath(location.pathname);

  const activeItem =
    filteredMenu.find((item) => item.key === activeMenu) ?? filteredMenu[0];

  // Ctrl+B shortcut untuk collapse sidebar (desktop)
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  // Tutup drawer saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Kunci scroll body saat drawer terbuka
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <div
      className={`dashboard-shell${isCollapsed ? " dashboard-shell--collapsed" : ""}`}
    >
      {/* Sidebar / Drawer */}
      <aside
        className={`dashboard-sidebar${isMobileMenuOpen ? " dashboard-sidebar--open" : ""}`}
      >
        <div className="dashboard-sidebar__top">
          <div className="dashboard-logo" title="SIPETA">
            <img src={sipetaLogo} alt="SIPETA" />
          </div>

          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
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
              key={item.key}
              className={`dashboard-menu__item${activeMenu === item.key ? " dashboard-menu__item--active" : ""
                }`}
              type="button"
              onClick={() => {
                navigate(
                  item.key === "dashboard"
                    ? `${basePath}/dashboard`
                    : `${basePath}/${item.key}`
                );
                setIsMobileMenuOpen(false);
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="dashboard-menu__icon">{item.icon}</span>
              <span className="dashboard-menu__label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="dashboard-sidebar__bottom">
          <button
            className="dashboard-menu__item dashboard-menu__item--logout"
            onClick={() => {
              Swal.fire({
                title: "Apakah Anda yakin?",
                text: "Anda akan keluar dari sistem",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#ff4d4f",
                cancelButtonColor: "#6b7280",
                confirmButtonText: "Ya, Logout",
                cancelButtonText: "Batal",
                reverseButtons: true,
              }).then((result) => {
                if (result.isConfirmed) {
                  logout();
                  navigate("/login");
                }
              });
            }}
          >
            <span className="dashboard-menu__icon">
              <svg viewBox="0 0 24 24">
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
                <path d="M9 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
              </svg>
            </span>
            <span className="dashboard-menu__label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Konten utama */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__left">
            {/* Tombol hamburger — hanya tampil di mobile */}
            <button
              className="hamburger-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <h1>{activeItem.label}</h1>
              <p>{pageDescriptions[activeItem.key]}</p>
            </div>
          </div>

          <div className="dashboard-header__right">
            {/* Avatar → navigasi ke settings */}
            <div
              className="dashboard-profile"
              aria-label="Profil pengguna"
              onClick={() => navigate(`${basePath}/settings`)}
              style={{ cursor: "pointer" }}
            >
              <img
                src={
                  user?.avatar
                    ? `http://103.157.27.220:8000/storage/${user.avatar}`
                    : "https://i.pravatar.cc/96"
                }
                alt="Profil pengguna"
              />
            </div>
          </div>
        </header>

        {/* Outlet menggantikan pageMap — render child route di sini */}
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>

      {/* Overlay gelap saat drawer terbuka di mobile */}
      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}