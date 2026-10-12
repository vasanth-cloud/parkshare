import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('parkshare_customer_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('parkshare_customer_token');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      api.getMe()
        .then((userData) => {
          try {
            localStorage.setItem('parkshare_customer_user', JSON.stringify(userData));
          } catch {}
          setUser(userData);
        })
        .catch((err: any) => {
          if (err?.status === 401 || err?.message?.toLowerCase().includes('unauthorized') || err?.message?.toLowerCase().includes('credentials')) {
            logout();
          } else {
            console.warn('Network issue fetching customer profile, keeping cached session');
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, userData: User) => {
    try {
      localStorage.setItem('parkshare_customer_token', newToken);
      localStorage.setItem('parkshare_customer_user', JSON.stringify(userData));
    } catch {}
    setToken(newToken);
    setUser(userData);
  };

  const updateUser = (userData: User) => {
    try {
      localStorage.setItem('parkshare_customer_user', JSON.stringify(userData));
    } catch {}
    setUser(userData);
  };

  const logout = () => {
    try {
      localStorage.removeItem('parkshare_customer_token');
      localStorage.removeItem('parkshare_customer_user');
    } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
