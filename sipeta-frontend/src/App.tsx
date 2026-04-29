import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Import Layout & Halaman Dashboard
import DashboardLayout from "./layout/DashboardLayout";
import UserDashboard from "./pages/dashboard/UserDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import SuperadminDashboard from "./pages/dashboard/SuperAdminDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rute Berdasarkan Role */}
      <Route path="/user" element={<DashboardLayout role="user" />}>
        <Route path="dashboard" element={<UserDashboard />} />
      </Route>

      <Route path="/admin" element={<DashboardLayout role="admin" />}>
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>

      <Route path="/superadmin" element={<DashboardLayout role="superadmin" />}>
        <Route path="dashboard" element={<SuperadminDashboard />} />
      </Route>

      {/* Jika user mengakses /dashboard secara umum, arahkan ke login atau dashboard tertentu */}
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;