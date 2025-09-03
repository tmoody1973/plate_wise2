/**
 * Authentication button component for OAuth providers
 * Supports Google, Facebook, and Apple sign-in with cultural theming
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { AuthProvider } from '@/lib/auth/auth-config';

interface AuthButtonProps {
  provider: AuthProvider;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    icon: (
      <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  apple: {
    name: 'Apple',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.017 0C8.396 0 8.025.044 8.025.044c0 0-.396.044-.396.044C4.747.044 2.85 2.72 2.85 5.13c0 2.409 1.897 5.086 4.779 5.086.396 0 .792-.044 1.188-.088.396.044.792.088 1.188.088 2.882 0 4.779-2.677 4.779-5.086C14.784 2.72 12.887.044 10.005.044c0 0-.371-.044-.371-.044S11.621 0 12.017 0zm-.792 1.32c1.584 0 2.871 1.287 2.871 2.871s-1.287 2.871-2.871 2.871-2.871-1.287-2.871-2.871S9.641 1.32 11.225 1.32z"/>
      </svg>
    ),
  },
} as const;

export function AuthButton({ 
  provider, 
  variant = 'default', 
  size = 'default', 
  className = '',
  children 
}: AuthButtonProps) {
  const { signInWithProvider } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const config = providerConfig[provider];

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const result = await signInWithProvider(provider);
      
      if (!result.success && result.error) {
        console.error(`${config.name} sign-in error:`, result.error);
        // In production, show user-friendly error message
      }
    } catch (error) {
      console.error(`${config.name} sign-in error:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          {config.icon}
          <span>Continue with {config.name}</span>
        </>
      )}
    </button>
  );
}