import { CulturalTheme } from '@/types';
import { getThemeById, DEFAULT_THEME } from './cultural-themes';
import { FaviconService } from '../favicon/favicon-service';

const THEME_STORAGE_KEY = 'platewise-cultural-theme';

export class ThemeService {
  /**
   * Save the selected theme to localStorage
   */
  static saveTheme(themeId: string): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }

  /**
   * Load the saved theme from localStorage
   */
  static loadTheme(): CulturalTheme {
    try {
      const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedThemeId) {
        return getThemeById(savedThemeId);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
    return DEFAULT_THEME;
  }

  /**
   * Clear the saved theme from localStorage
   */
  static clearTheme(): void {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear theme from localStorage:', error);
    }
  }

  /**
   * Apply theme CSS variables to the document root
   */
  static applyThemeToDocument(theme: CulturalTheme, mode: 'light' | 'dark' = 'light'): void {
    const root = document.documentElement;
    const colors = theme.colors[mode];
    
    // Apply color variables
    root.style.setProperty('--cultural-primary', colors.primary);
    root.style.setProperty('--cultural-secondary', colors.secondary);
    root.style.setProperty('--cultural-accent', colors.accent);
    
    // Apply gradient variables
    root.style.setProperty(
      '--cultural-gradient', 
      `linear-gradient(135deg, ${colors.gradient?.join(', ') || colors.primary + ', ' + colors.secondary})`
    );
    
    // Apply pattern variables
    root.style.setProperty('--cultural-pattern-bg', theme.patterns.background);
    root.style.setProperty('--cultural-pattern-accent', theme.patterns.accent);
    
    // Apply typography variables
    root.style.setProperty('--cultural-font-heading', theme.typography.heading);
    root.style.setProperty('--cultural-font-body', theme.typography.body);
    
    // Add theme class to body for CSS targeting
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '') // Remove existing theme classes
      .trim();
    document.body.classList.add(`theme-${theme.id}`);
    
    // Update favicon to match theme
    FaviconService.updateFavicon(theme);
  }

  /**
   * Get theme preference from user profile cultural cuisines
   */
  static getThemeFromCuisines(cuisines: string[]): CulturalTheme {
    if (!cuisines || cuisines.length === 0) {
      return DEFAULT_THEME;
    }

    // Try to match the first cuisine to a theme
    const primaryCuisine = cuisines?.[0]?.toLowerCase();
    
    if (primaryCuisine && (primaryCuisine.includes('mediterranean') || 
        primaryCuisine.includes('greek') || 
        primaryCuisine.includes('italian'))) {
      return getThemeById('mediterranean');
    }
    
    if (primaryCuisine && (primaryCuisine.includes('asian') || 
        primaryCuisine.includes('chinese') || 
        primaryCuisine.includes('japanese'))) {
      return getThemeById('asian');
    }
    
    if (primaryCuisine && (primaryCuisine.includes('latin') || 
        primaryCuisine.includes('mexican') || 
        primaryCuisine.includes('spanish'))) {
      return getThemeById('latin');
    }
    
    if (primaryCuisine && (primaryCuisine.includes('african') || 
        primaryCuisine.includes('ethiopian'))) {
      return getThemeById('african');
    }
    
    if (primaryCuisine && (primaryCuisine.includes('middle') || 
        primaryCuisine.includes('persian') || 
        primaryCuisine.includes('turkish'))) {
      return getThemeById('middle-eastern');
    }
    
    return DEFAULT_THEME;
  }

  /**
   * Initialize theme on app startup
   */
  static initializeTheme(): CulturalTheme {
    const theme = this.loadTheme();
    this.applyThemeToDocument(theme, 'light');
    return theme;
  }
}