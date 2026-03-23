import React, { createContext, useContext, useEffect, useState } from "react";

type Role = "worker" | "manager" | null;

interface AppState {
  role: Role;
  workerId: number | null;
  setRole: (role: Role) => void;
  setWorkerId: (id: number | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [workerId, setWorkerIdState] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem("shakasite_role") as Role;
    const storedWorkerId = localStorage.getItem("shakasite_workerId");
    
    if (storedRole) setRoleState(storedRole);
    if (storedWorkerId) setWorkerIdState(parseInt(storedWorkerId, 10));
    
    setIsInitialized(true);
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem("shakasite_role", newRole);
    } else {
      localStorage.removeItem("shakasite_role");
    }
  };

  const setWorkerId = (id: number | null) => {
    setWorkerIdState(id);
    if (id) {
      localStorage.setItem("shakasite_workerId", id.toString());
    } else {
      localStorage.removeItem("shakasite_workerId");
    }
  };

  const logout = () => {
    setRole(null);
    setWorkerId(null);
  };

  if (!isInitialized) return null;

  return (
    <AppContext.Provider value={{ role, workerId, setRole, setWorkerId, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
