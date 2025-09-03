'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CulturalTheme, ThemeContextType, ThemeMode } from '@/types';
import { CULTURAL_THEMES, DEFAULT_THEME } from '@/lib/themes/cultural-themes';
import { ThemeService } from '@/lib/themes/theme-service';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<CulturalTheme>(DEFAULT_THEME);
  const [currentMode, setCurrentMode] = useState<ThemeMode>('light');
  const [preferences, setPreferencesState] = useState({
    culturalTheme: DEFAULT_THEME.id,
    mode: 'light' as const,
    highContrast: false,
    reducedMotion: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize theme on mount
    const initializeTheme = () => {
      try {
        const savedTheme = ThemeService.initializeTheme();
        setCurrentTheme(savedTheme);
      } catch (error) {
        console.warn('Failed to initialize theme:', error);
        setCurrentTheme(DEFAULT_THEME);
        ThemeService.applyThemeToDocument(DEFAULT_THEME, 'light');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  const setTheme = (themeId: string) => {
    const newTheme = CULTURAL_THEMES.find(theme => theme.id === themeId) || DEFAULT_THEME;
    
    setCurrentTheme(newTheme);
    setPreferencesState(prev => ({ ...prev, culturalTheme: themeId }));
    ThemeService.saveTheme(newTheme.id);
    
    const resolvedMode = currentMode === 'system' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
      currentMode as 'light' | 'dark';
    
    ThemeService.applyThemeToDocument(newTheme, resolvedMode);
  };

  const setMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    setPreferencesState(prev => ({ ...prev, mode }));
    
    const resolvedMode = mode === 'system' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
      mode as 'light' | 'dark';
    
    ThemeService.applyThemeToDocument(currentTheme, resolvedMode);
  };

  const setPreferences = (newPreferences: Partial<typeof preferences>) => {
    setPreferencesState(prev => ({ ...prev, ...newPreferences }));
  };

  const resolvedMode = currentMode === 'system' ? 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
    currentMode as 'light' | 'dark';

  const contextValue: ThemeContextType = {
    currentTheme,
    currentMode,
    resolvedMode,
    preferences,
    availableThemes: CULTURAL_THEMES,
    setTheme,
    setMode,
    setPreferences,
    isLoading
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get theme-aware CSS classes
export function useThemeClasses() {
  const { currentTheme } = useTheme();
  
  return {
    primary: `bg-[${currentTheme.colors.primary}] text-white`,
    secondary: `bg-[${currentTheme.colors.secondary}] text-white`,
    accent: `bg-[${currentTheme.colors.accent}] text-white`,
    gradient: `bg-gradient-to-br from-[${currentTheme.colors.primary}] to-[${currentTheme.colors.secondary}]`,
    border: `border-[${currentTheme.colors.primary}]`,
    text: `text-[${currentTheme.colors.primary}]`,
    hover: `hover:bg-[${currentTheme.colors.primary}] hover:text-white`,
    culturalPattern: `theme-${currentTheme.id}`,
  };
}