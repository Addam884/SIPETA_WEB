import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react/jsx-dev-runtime";

type Props = {
  children: JSX.Element;
  allowedRoles: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth();

  // ⏳ tunggu fetch selesai
  if (loading) {
    return <div>Loading...</div>;
  }

  // ❌ belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ❌ role tidak sesuai
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
}