import React, { createContext, useContext, useState, useCallback } from "react";

interface AuthContextType {
  token: string | null;
  adminName: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Admin User");
  const [baseUrl, setBaseUrl] = useState("https://your-domain.com");

  const login = useCallback(async (email: string, _password: string) => {
    // Mock login — accepts any valid email
    if (email && email.includes("@")) {
      setToken("mock-jwt-token-12345");
      setAdminName(email.split("@")[0]);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdminName("Admin User");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        adminName,
        isAuthenticated: !!token,
        login,
        logout,
        baseUrl,
        setBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
