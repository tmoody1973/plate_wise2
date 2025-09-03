"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { LandingPage } from '@/components/landing/LandingPage';
import { LoadingScreen } from '@/components/landing/LoadingScreen';

export default function HomePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />;
  }

  // This will redirect authenticated users to dashboard
  return null;
}
