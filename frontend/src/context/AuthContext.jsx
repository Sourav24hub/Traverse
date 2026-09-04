import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/authApi';

const AuthContext = createContext(null);

const SESSION_KEY = 'traverse_auth_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from sessionStorage on mount
  useEffect(() => {
    async function initAuth() {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.accessToken) {
            // Validate token with backend
            const res = await getMe(parsed.accessToken);
            if (res.ok) {
              setUser({ ...res.data, accessToken: parsed.accessToken });
            } else {
              // Token invalid/expired
              sessionStorage.removeItem(SESSION_KEY);
            }
          }
        } catch (err) {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
