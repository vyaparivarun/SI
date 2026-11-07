import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, getToken, setToken } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = logged out, object = logged-in user
  const [user, setUser] = useState(getToken() ? null : false);

  useEffect(() => {
    if (!getToken()) return;
    getMe().then(setUser).catch(() => { setToken(null); setUser(false); });
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(false);
    window.addEventListener("si-logout", onLogout);
    return () => window.removeEventListener("si-logout", onLogout);
  }, []);

  const login = (token, u) => { setToken(token); setUser(u); };
  const logout = () => { setToken(null); setUser(false); };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
