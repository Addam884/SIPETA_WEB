import { useState } from "react";
import { useNavigate } from "react-router-dom";

type NavbarProps = {
  scrollToSection: (id: string) => void;
};

function Navbar({ scrollToSection }: NavbarProps) {

  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleScroll = (id: string) => {
    scrollToSection(id);
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">

      {/* BRAND */}
      <div
        className="nav-brand"
        onClick={() => handleScroll("beranda")}
        style={{ cursor: "pointer" }}
      >
        <div className="brand-icon">+</div>
        <span className="brand-name">SIPETA</span>
      </div>

      {/* NAV LINKS */}
      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>

        <li className="nav-item" onClick={() => handleScroll("beranda")}>
          Beranda
        </li>

        <li className="nav-item" onClick={() => handleScroll("tentang")}>
          Tentang
        </li>

        <li className="nav-item" onClick={() => handleScroll("peta")}>
          Peta Penyakit
        </li>

        <li className="nav-item" onClick={() => handleScroll("fitur")}>
          Fitur
        </li>

      </ul>

      {/* LOGIN BUTTON */}
      <button className="btn-login" onClick={() => navigate("/login")}>
        <span>Login</span>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>

      </button>

      {/* HAMBURGER */}
      <div
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

    </nav>
  );
}

export default Navbar;