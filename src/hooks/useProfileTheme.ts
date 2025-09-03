'use client';

import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { ThemeService } from '@/lib/themes/theme-service';

/**
 * Hook to automatically sync theme with user profile preferences
 * This hook will:
 * 1. Load theme from user profile cultural cuisines when user logs in
 * 2. Save theme preference when user changes theme
 * 3. Fallback to saved theme or default when no profile is available
 */
export function useProfileTheme() {
  const { currentTheme, setTheme } = useTheme();
  const { user } = useAuth();

  // TODO: Sync theme with user profile on login/profile changes
  // This will be implemented when we have profile loading functionality
  useEffect(() => {
    if (user) {
      // For now, just ensure we have a theme set
      const savedThemeId = localStorage.getItem('platewise-cultural-theme');
      if (!savedThemeId) {
        // Set a default theme if none is saved
        setTheme('mediterranean');
      }
    }
  }, [user, setTheme]);

  // Function to update theme and optionally save to profile
  const updateTheme = (themeId: string, saveToProfile: boolean = false) => {
    setTheme(themeId);
    
    if (saveToProfile && user) {
      // TODO: Update user profile with theme preference
      // This would be implemented when we have profile update functionality
      console.log('Theme preference would be saved to profile:', themeId);
    }
  };

  return {
    currentTheme,
    updateTheme,
    isProfileSynced: false // TODO: Implement profile syncing
  };
}