import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// Role is kept in memory only (no backend / persistence), as required.
// Selecting a role on the Role Selection page is treated as "logging in" as that role.
export function AuthProvider({ children }) {
  const [role, setRole] = useState(null); // "User" | "Coach" | "Admin" | null

  const selectRole = (nextRole) => setRole(nextRole);
  const logout = () => setRole(null);

  return (
    <AuthContext.Provider value={{ role, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
