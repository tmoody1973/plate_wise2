/**
 * Protected route component for authentication-required pages
 * Redirects unauthenticated users to sign-in page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireProfile?: boolean;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/auth',
  requireProfile = false 
}: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized || loading) return;

    if (!user) {
      router.push(redirectTo as any);
      return;
    }

    // TODO: Add profile completion check when requireProfile is true
    // This will be implemented in the next subtask
  }, [user, loading, initialized, router, redirectTo, requireProfile]);

  // Show loading state while checking authentication
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}