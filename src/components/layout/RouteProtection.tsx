'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { LoadingPage } from '@/components/ui/loading';

interface RouteProtectionProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  loadingMessage?: string;
}

export function RouteProtection({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth',
  loadingMessage = 'Loading...'
}: RouteProtectionProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (requireAuth && !user) {
      setIsRedirecting(true);
      // Store the intended destination
      sessionStorage.setItem('redirectAfterAuth', pathname);
      router.push(redirectTo as any);
      return;
    }

    if (!requireAuth && user) {
      // User is logged in but trying to access auth pages
      const intendedDestination = sessionStorage.getItem('redirectAfterAuth');
      if (intendedDestination) {
        sessionStorage.removeItem('redirectAfterAuth');
        router.push(intendedDestination as any);
      } else {
        router.push('/dashboard');
      }
      return;
    }

    setIsRedirecting(false);
  }, [user, loading, requireAuth, router, redirectTo, pathname]);

  // Show loading while auth is loading or redirecting
  if (loading || isRedirecting) {
    return <LoadingPage message={loadingMessage} />;
  }

  // Show nothing if auth requirements aren't met (will redirect)
  if (requireAuth && !user) {
    return null;
  }

  if (!requireAuth && user) {
    return null;
  }

  return <>{children}</>;
}

// Specific wrappers for common use cases
export function ProtectedPage({ children, loadingMessage }: { 
  children: React.ReactNode; 
  loadingMessage?: string;
}) {
  return (
    <RouteProtection 
      requireAuth={true} 
      loadingMessage={loadingMessage || 'Loading your dashboard...'}
    >
      {children}
    </RouteProtection>
  );
}

export function PublicPage({ children, loadingMessage }: { 
  children: React.ReactNode; 
  loadingMessage?: string;
}) {
  return (
    <RouteProtection 
      requireAuth={false} 
      loadingMessage={loadingMessage || 'Redirecting...'}
    >
      {children}
    </RouteProtection>
  );
}

export function OptionalAuthPage({ children }: { children: React.ReactNode }) {
  const { loading } = useAuthContext();
  
  if (loading) {
    return <LoadingPage message="Loading..." />;
  }
  
  return <>{children}</>;
}