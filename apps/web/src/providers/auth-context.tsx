'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@dishrank/shared';
import { api } from '@/lib/api';
import { mockUser } from '@/lib/mock-data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, phone: string, password: string) => Promise<User>;
  updateProfile: (data: { name?: string; email?: string; phone?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
  useMockAuth: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (useMockAuth) {
        const u = { ...mockUser, email };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        return u;
      }
      const res = await api.login(email, password);
      localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      return res.user;
    },
    [useMockAuth],
  );

  const register = useCallback(
    async (name: string, email: string, phone: string, password: string) => {
      if (useMockAuth) {
        const u = { ...mockUser, name, email, phone };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        return u;
      }
      const res = await api.register(name, email, phone, password);
      localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      return res.user;
    },
    [useMockAuth],
  );

  const updateProfile = useCallback(
    async (data: { name?: string; email?: string; phone?: string }) => {
      if (useMockAuth) {
        const next = { ...user!, ...data } as User;
        setUser(next);
        localStorage.setItem('user', JSON.stringify(next));
        return;
      }
      const updated = await api.updateProfile(data);
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    },
    [useMockAuth, user],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (useMockAuth) return;
      await api.changePassword({ currentPassword, newPassword });
    },
    [useMockAuth],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        updateProfile,
        changePassword,
        logout,
        useMockAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
