import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  updateUser: (fields: Partial<User>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize user instantly from persistent cache so UI has zero flicker on reload
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('parkshare_host_user');
      const cachedAvatar = localStorage.getItem('parkshare_host_avatar');
      if (savedUser) {
        const parsed: User = JSON.parse(savedUser);
        if (cachedAvatar) {
          parsed.profile_photo_url = cachedAvatar;
        }
        return parsed;
      }
    } catch {}
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('parkshare_host_token');
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      api.getMe()
        .then((userData) => {
          const cachedAvatar = localStorage.getItem('parkshare_host_avatar');
          // If server photo is missing but we have cached photo, keep cached photo and back-sync
          if (!userData.profile_photo_url && cachedAvatar) {
            userData.profile_photo_url = cachedAvatar;
            api.updateProfilePhoto(cachedAvatar).catch(() => {});
          } else if (userData.profile_photo_url) {
            try {
              localStorage.setItem('parkshare_host_avatar', userData.profile_photo_url);
            } catch {}
          }

          try {
            localStorage.setItem('parkshare_host_user', JSON.stringify(userData));
          } catch {}

          setUser(userData);
        })
        .catch((err: any) => {
          if (err?.status === 401 || err?.message?.toLowerCase().includes('unauthorized')) {
            console.warn('Host token is expired or unauthorized, clearing session');
            logout();
          } else {
            console.warn('Network issue fetching user profile');
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, userData: User) => {
    try {
      localStorage.setItem('parkshare_host_token', newToken);
    } catch {}
    setToken(newToken);

    const cachedAvatar = localStorage.getItem('parkshare_host_avatar');
    if (!userData.profile_photo_url && cachedAvatar) {
      userData.profile_photo_url = cachedAvatar;
    } else if (userData.profile_photo_url) {
      try {
        localStorage.setItem('parkshare_host_avatar', userData.profile_photo_url);
      } catch {}
    }

    try {
      localStorage.setItem('parkshare_host_user', JSON.stringify(userData));
    } catch {}

    setUser(userData);
  };

  const updateUser = (fields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      if (fields.profile_photo_url) {
        try {
          localStorage.setItem('parkshare_host_avatar', fields.profile_photo_url);
        } catch {}
      }
      try {
        localStorage.setItem('parkshare_host_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const logout = () => {
    try {
      localStorage.removeItem('parkshare_host_token');
      localStorage.removeItem('parkshare_host_user');
    } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, isLoading }}>
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
