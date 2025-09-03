/**
 * Custom React hook for authentication state management
 * Provides authentication context and utilities for PlateWise
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { authHelpers, type AuthResult, type SignUpData, type SignInData } from '@/lib/auth/auth-helpers';
import type { AuthProvider } from '@/lib/auth/auth-config';

export interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

export interface AuthActions {
  signUp: (data: SignUpData) => Promise<AuthResult>;
  signIn: (data: SignInData) => Promise<AuthResult>;
  signInWithProvider: (provider: AuthProvider) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
}

export interface UseAuthReturn extends AuthState, AuthActions {}

/**
 * Custom hook for authentication state and actions
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  // Initialize auth state and set up listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const user = await authHelpers.getCurrentUser();
        
        if (mounted) {
          setState({
            user,
            loading: false,
            initialized: true,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setState({
            user: null,
            loading: false,
            initialized: true,
          });
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = authHelpers.onAuthStateChange((user) => {
      if (mounted) {
        setState(prev => ({
          ...prev,
          user,
          loading: false,
          initialized: true,
        }));
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auth actions
  const signUp = useCallback(async (data: SignUpData): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await authHelpers.signUp(data);
      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const signIn = useCallback(async (data: SignInData): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await authHelpers.signIn(data);
      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: AuthProvider): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await authHelpers.signInWithProvider(provider);
      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await authHelpers.signOut();
      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    return authHelpers.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    return authHelpers.updatePassword(password);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const user = await authHelpers.getCurrentUser();
      setState(prev => ({
        ...prev,
        user,
        loading: false,
      }));
    } catch (error) {
      console.error('Error refreshing user:', error);
      setState(prev => ({
        ...prev,
        user: null,
        loading: false,
      }));
    }
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  };
}
