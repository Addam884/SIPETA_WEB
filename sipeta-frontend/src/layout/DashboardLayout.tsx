import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Globe, 
  FolderOpen, 
  Database, 
  Settings, 
  UserCircle 
} from 'lucide-react';
import '../styles/DashboardLayout.css';

export type Role = 'user' | 'admin' | 'superadmin';

interface LayoutProps {
  role: Role;
}

const DashboardLayout: React.FC<LayoutProps> = ({ role }) => {
  const navigate = useNavigate();

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">SIPETA</div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink 
                to={`/${role}/dashboard`} 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <LineChart size={20} />
                <span>Dashboard</span>
              </NavLink>
            </li>

            <li>
              <NavLink 
                to={`/${role}/gis`} 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <Globe size={20} />
                <span>GIS</span>
              </NavLink>
            </li>

            <li>
              <NavLink 
                to={`/${role}/data-master`} 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <FolderOpen size={20} />
                <span>Data Master</span>
              </NavLink>
            </li>

            <li>
              <NavLink 
                to={`/${role}/data-kasus`} 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <Database size={20} />
                <span>Data Kasus</span>
              </NavLink>
            </li>

            <li>
              <NavLink 
                to={`/${role}/settings`} 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <Settings size={20} />
                <span>Settings</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="main-header">
          <div className="header-spacer"></div>

          <div 
            className="header-profile" 
            onClick={() => navigate('/login')} 
            style={{ cursor: 'pointer' }} 
            title="Logout"
          >
            <UserCircle size={40} color="var(--text-muted)" />
          </div>
        </header>

        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;