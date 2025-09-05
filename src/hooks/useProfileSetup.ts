/**
 * Hook for managing profile setup state and navigation
 * Checks if user has completed profile setup and provides navigation helpers
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { profileService } from '@/lib/profile/profile-service';
import type { UserProfile } from '@/types';

interface UseProfileSetupResult {
  isLoading: boolean;
  hasCompletedSetup: boolean | null;
  profile: UserProfile | null;
  error: string | null;
  checkSetupStatus: () => Promise<void>;
  redirectToSetup: () => void;
  redirectToDashboard: () => void;
}

export function useProfileSetup(): UseProfileSetupResult {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSetupStatus = async () => {
    if (!user) {
      setIsLoading(false);
      setHasCompletedSetup(null);
      setProfile(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if setup is completed
      const setupResult = await profileService.hasCompletedSetup(user.id);
      
      if (!setupResult.success) {
        // If there's an error checking setup, assume it's not complete
        // This ensures new users or users with DB issues get redirected to setup
        console.warn('Error checking setup status, assuming not complete:', setupResult.error);
        setHasCompletedSetup(false);
        return;
      }

      setHasCompletedSetup(setupResult.data || false);

      // If setup is completed, fetch the full profile
      if (setupResult.data) {
        const profileResult = await profileService.getProfile(user.id);
        
        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data);
        } else {
          console.warn('Setup marked as complete but profile not found');
          setHasCompletedSetup(false);
        }
      }
    } catch (err) {
      console.error('Error checking profile setup status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setHasCompletedSetup(false);
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToSetup = () => {
    console.log('Attempting to redirect to /profile/setup');
    router.push('/profile/setup');
  };

  const redirectToDashboard = () => {
    router.push('/dashboard');
  };

  // Check setup status when user changes
  useEffect(() => {
    if (!authLoading) {
      void checkSetupStatus();
    }
  }, [user, authLoading]);

  return {
    isLoading: isLoading || authLoading,
    hasCompletedSetup,
    profile,
    error,
    checkSetupStatus,
    redirectToSetup,
    redirectToDashboard,
  };
}

/**
 * Hook for protecting routes that require completed profile setup
 */
export function useRequireProfileSetup() {
  const { isLoading, hasCompletedSetup, redirectToSetup } = useProfileSetup();

  useEffect(() => {
    // Check if user is currently in setup process
    const isInSetupProcess = typeof window !== 'undefined' && 
      (window.location.pathname.includes('/profile/setup') || 
       localStorage.getItem('platewise-setup-step') !== null ||
       localStorage.getItem('platewise-setup-in-progress') === 'true');
    
    console.log('useRequireProfileSetup check:', { 
      isLoading, 
      hasCompletedSetup, 
      isInSetupProcess,
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      setupStep: typeof window !== 'undefined' ? localStorage.getItem('platewise-setup-step') : null,
      setupInProgress: typeof window !== 'undefined' ? localStorage.getItem('platewise-setup-in-progress') : null
    });
    
    // Only redirect if not in setup process and setup is not completed
    if (!isLoading && hasCompletedSetup === false && !isInSetupProcess) {
      console.log('useRequireProfileSetup: Redirecting to setup', { hasCompletedSetup, isInSetupProcess });
      redirectToSetup();
    }
  }, [isLoading, hasCompletedSetup, redirectToSetup]);

  return {
    isLoading,
    hasCompletedSetup,
  };
}

/**
 * Hook for protecting setup routes (redirect to dashboard if already completed)
 */
export function useRedirectIfSetupComplete() {
  const { isLoading, hasCompletedSetup, redirectToDashboard } = useProfileSetup();

  useEffect(() => {
    if (!isLoading && hasCompletedSetup === true) {
      redirectToDashboard();
    }
  }, [isLoading, hasCompletedSetup, redirectToDashboard]);

  return {
    isLoading,
    hasCompletedSetup,
  };
}