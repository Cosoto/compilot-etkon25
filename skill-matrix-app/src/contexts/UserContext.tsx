'use client';

import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import type { User } from '@supabase/supabase-js';

type ExtendedUser = User & {
  role?: 'admin' | 'user';
};

type UserContextType = {
  user: ExtendedUser | null;
  isAdmin: boolean;
  isLoading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  const value = {
    user,
    isAdmin: user?.role === 'admin',
    isLoading: loading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 