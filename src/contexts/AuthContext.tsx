import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createApi, type User } from "@/lib/api";

const STORAGE_KEYS = {
  token: "etymos_access_token",
  refresh: "etymos_refresh_token",
  user: "etymos_user",
};

interface AuthContextType {
  token: string | null;
  user: User | null;
  adminName: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean | string>;
  logout: () => void;
  api: ReturnType<typeof createApi>;
}

const DEFAULT_BASE_URL = "/api";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEYS.token)
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEYS.refresh)
  );
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  // Rebuild the api client whenever token changes
  const api = createApi(DEFAULT_BASE_URL, token);

  // Attempt token refresh on mount if we have a stored refresh token but no
  // valid access token (handles page reloads after expiry)
  useEffect(() => {
    if (!token && refreshToken) {
      createApi(DEFAULT_BASE_URL)
        .auth.refresh(refreshToken)
        .then((data) => {
          setToken(data.access_token);
          setRefreshToken(data.refresh_token);
          setUser(data.user);
          localStorage.setItem(STORAGE_KEYS.token, data.access_token);
          localStorage.setItem(STORAGE_KEYS.refresh, data.refresh_token);
          localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
        })
        .catch(() => {
          // Refresh failed — clear stale session
          localStorage.removeItem(STORAGE_KEYS.token);
          localStorage.removeItem(STORAGE_KEYS.refresh);
          localStorage.removeItem(STORAGE_KEYS.user);
        });
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean | string> => {
      try {
        const data = await createApi(DEFAULT_BASE_URL).auth.login(email, password);
        if (!data.user.is_admin) {
          return "Access Denied: You are not authorized to access the admin portal.";
        }
        setToken(data.access_token);
        setRefreshToken(data.refresh_token);
        setUser(data.user);
        localStorage.setItem(STORAGE_KEYS.token, data.access_token);
        localStorage.setItem(STORAGE_KEYS.refresh, data.refresh_token);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    const rt = refreshToken;
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refresh);
    localStorage.removeItem(STORAGE_KEYS.user);
    // Fire-and-forget — best effort
    if (rt) {
      createApi(DEFAULT_BASE_URL).auth.logout(rt).catch(() => {});
    }
  }, [refreshToken]);

  const adminName = user?.full_name || user?.email || "Admin";

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        adminName,
        isAuthenticated: !!token,
        login,
        logout,
        api,
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
