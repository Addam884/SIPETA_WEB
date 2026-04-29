import { NavLink, Outlet, useLocation } from "react-router-dom";
import "../styles/DashboardLayout.css";
 
const menuItems = [
  { label: "Dashboard", path: "/app/dashboard", icon: "⌁" },
  { label: "GIS", path: "/app/gis", icon: "◉" },
  { label: "Settings", path: "/app/settings", icon: "⚙" },
];
 
const pageTitles: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/gis": "GIS",
  "/app/settings": "Settings",
};
 
function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Dashboard";
 
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <NavLink className="dashboard-logo" to="/app/dashboard">
          SIPETA
        </NavLink>
 
        <nav className="dashboard-menu" aria-label="Menu utama SIPETA">
          {menuItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `dashboard-menu__item${isActive ? " dashboard-menu__item--active" : ""}`
              }
              key={item.path}
              to={item.path}
            >
              <span className="dashboard-menu__icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
 
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-header__eyebrow">Sistem Informasi Surveilans</p>
            <h1>{title}</h1>
          </div>
 
          <div className="dashboard-header__actions">
            <button className="dashboard-header__button" type="button">
              Export
            </button>
            <div className="dashboard-profile" aria-label="Profil pengguna">
              <img src="https://i.pravatar.cc/96?img=12" alt="Profil pengguna SIPETA" />
            </div>
          </div>
        </header>
 
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
 
export default DashboardLayout;