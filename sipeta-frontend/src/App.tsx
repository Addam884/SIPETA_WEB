import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import SuperadminDashboard from "./pages/dashboard/SuperAdminDashboard";
import UserDashboard from "./pages/dashboard/UserDashboard";
import Register from "./pages/Register";
import DataMasterLayout from "./layouts/DataMasterLayout";
// import Penyakit from "./pages/datamaster/Penyakit";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/user" element={<DashboardLayout role="user" />}>
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
      </Route>

      <Route path="/admin" element={<DashboardLayout role="admin" />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>

      <Route path="/superadmin" element={<DashboardLayout role="superadmin" />}>
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperadminDashboard />} />
        <Route path="datamaster" element={<DataMasterLayout />}>
          {/* <Route path="penyakit" element={<Penyakit />} /> */}
          {/* <Route path="populasi" element={<div>Halaman Populasi</div>} />
          <Route path="wilayah" element={<div>Halaman Wilayah</div>} />
          <Route path="faskes" element={<div>Halaman Faskes</div>} /> */}
        </Route>
      </Route>

      <Route path="/dashboard" element={<Navigate to="/login" replace />} />

      
    </Routes>
  );
}

export default App;