'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SafeUserDTO } from '@/lib/userAuth';
import AuthModal, { type AuthModalView } from '@/components/modals/AuthModal';

interface AuthContextValue {
  user: SafeUserDTO | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<SafeUserDTO | null>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUserDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('login');

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const openAuthModal = useCallback((view: AuthModalView = 'login') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalView,
        openAuthModal,
        closeAuthModal,
        refreshUser,
        setUser,
        logout
      }}
    >
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialView={authModalView}
        onClose={closeAuthModal}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setIsAuthModalOpen(false);
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được sử dụng bên trong <AuthProvider>');
  }
  return ctx;
}
