/**
 * Authentication context provider for PlateWise
 * Provides authentication state and actions throughout the app
 */

'use client';

import { createContext, useContext } from 'react';
import { useAuth, type UseAuthReturn } from '@/hooks/useAuth';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

// Export useAuth from the hook for direct access
export { useAuth } from '@/hooks/useAuth';