import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "user" | "admin" | "superadmin";
};

type AuthContextType = {
  user: User | null;
   loading: boolean;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const res = await api.get("/profile");
    setUser(res.data);
  } catch {
    setUser(null);
  } finally {
    setLoading(false); // ✅ WAJIB
  }
};

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dalam AuthProvider");
  return context;
}