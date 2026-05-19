import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/dashboard/AdminDashboard";
import SuperadminDashboard from "./pages/dashboard/SuperAdminDashboard";
import UserDashboard from "./pages/dashboard/UserDashboard";

import DataMasterLayout from "./layouts/DataMasterLayout";
// import Penyakit from "./pages/datamaster/Penyakit";

import Datakasus from "./pages/datakasus";
import GIS from "./pages/GIS";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";

function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ================= */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ================= USER ================= */}
      <Route
        path="/user/*"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout role="user" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="gis" element={<GIS />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* ================= ADMIN ================= */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="gis" element={<GIS />} />
        <Route path="datakasus" element={<Datakasus />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* ================= SUPERADMIN ================= */}
      <Route
        path="/superadmin/*"
        element={
          <ProtectedRoute allowedRoles={["superadmin"]}>
            <DashboardLayout role="superadmin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperadminDashboard />} />

        <Route path="datamaster" element={<DataMasterLayout />}>

          {/* contoh nested */}
          {/* <Route path="penyakit" element={<Penyakit />} /> */}
          {/* <Route path="populasi" element={<div>Populasi</div>} /> */}
          {/* <Route path="wilayah" element={<div>Wilayah</div>} /> */}
          {/* <Route path="faskes" element={<div>Faskes</div>} /> */}
        </Route>
        <Route path="settings" element={<Settings />} />
        <Route path="gis" element={<GIS />} />
        <Route path="datakasus" element={<Datakasus />} />
        <Route path="riwayat" element={<Logs />} />
      </Route>

      {/* ================= REDIRECT ================= */}
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;