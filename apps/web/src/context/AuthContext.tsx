import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../api/auth';
import { getMe } from '../api/users';
import { clearToken, isAuthenticated } from '../api/client';

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState & { logout: () => void; setUser: (u: User | null) => void }>({
  user: null,
  loading: true,
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: User | null) => setUserState(u), []);

  const logout = useCallback(() => {
    clearToken();
    setUserState(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    getMe().then((res) => {
      if (res.success && res.data) {
        setUserState({
          id: res.data.id,
          email: res.data.email,
          name: res.data.name,
        });
      } else {
        clearToken();
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
