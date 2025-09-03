import { CulturalTheme, ThemeColors } from '@/types';

// Helper function to create theme colors
const createThemeColors = (
  primary: string,
  secondary: string,
  accent: string,
  gradient: string[],
  isDark: boolean = false
): ThemeColors => {
  if (isDark) {
    return {
      primary,
      secondary,
      accent,
      gradient,
      background: '#0f0f0f',
      surface: '#1a1a1a',
      card: '#262626',
      foreground: '#fafafa',
      muted: '#a3a3a3',
      border: '#404040',
      ring: primary,
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    };
  }
  
  return {
    primary,
    secondary,
    accent,
    gradient,
    background: '#ffffff',
    surface: '#f8fafc',
    card: '#ffffff',
    foreground: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    ring: primary,
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  };
};

export const CULTURAL_THEMES: CulturalTheme[] = [
  {
    id: 'mediterranean',
    name: 'mediterranean',
    displayName: 'Mediterranean',
    colors: {
      light: createThemeColors('#E67E22', '#27AE60', '#3498DB', ['#E67E22', '#F39C12', '#27AE60']),
      dark: createThemeColors('#F39C12', '#2ECC71', '#5DADE2', ['#F39C12', '#E67E22', '#2ECC71'], true)
    },
    patterns: {
      background: 'olive-branch-pattern',
      accent: 'geometric-tiles'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro'
    },
    culturalElements: {
      cuisine: ['Greek', 'Italian', 'Spanish', 'Turkish', 'Lebanese'],
      traditions: ['Family dining', 'Seasonal cooking', 'Olive oil traditions'],
      ingredients: ['Olive oil', 'Tomatoes', 'Herbs', 'Seafood', 'Grains']
    }
  },
  {
    id: 'asian',
    name: 'asian',
    displayName: 'Asian Fusion',
    colors: {
      light: createThemeColors('#E74C3C', '#F39C12', '#8E44AD', ['#E74C3C', '#F39C12', '#8E44AD']),
      dark: createThemeColors('#FF6B6B', '#FFB74D', '#BA68C8', ['#FF6B6B', '#FFB74D', '#BA68C8'], true)
    },
    patterns: {
      background: 'bamboo-pattern',
      accent: 'wave-pattern'
    },
    typography: {
      heading: 'Noto Sans',
      body: 'Inter'
    },
    culturalElements: {
      cuisine: ['Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indian'],
      traditions: ['Balance principles', 'Tea culture', 'Seasonal harmony'],
      ingredients: ['Rice', 'Soy sauce', 'Ginger', 'Garlic', 'Vegetables']
    }
  },
  {
    id: 'latin',
    name: 'latin',
    displayName: 'Latin American',
    colors: {
      light: createThemeColors('#FF6B6B', '#4ECDC4', '#45B7D1', ['#FF6B6B', '#4ECDC4', '#45B7D1']),
      dark: createThemeColors('#FF8A80', '#4DD0E1', '#64B5F6', ['#FF8A80', '#4DD0E1', '#64B5F6'], true)
    },
    patterns: {
      background: 'aztec-pattern',
      accent: 'tropical-pattern'
    },
    typography: {
      heading: 'Montserrat',
      body: 'Open Sans'
    },
    culturalElements: {
      cuisine: ['Mexican', 'Brazilian', 'Peruvian', 'Colombian', 'Argentine'],
      traditions: ['Family celebrations', 'Street food culture', 'Harvest festivals'],
      ingredients: ['Corn', 'Beans', 'Chili peppers', 'Avocado', 'Lime']
    }
  },
  {
    id: 'african',
    name: 'african',
    displayName: 'African Heritage',
    colors: {
      light: createThemeColors('#D35400', '#27AE60', '#F1C40F', ['#D35400', '#27AE60', '#F1C40F']),
      dark: createThemeColors('#FF7043', '#4CAF50', '#FFEB3B', ['#FF7043', '#4CAF50', '#FFEB3B'], true)
    },
    patterns: {
      background: 'kente-pattern',
      accent: 'tribal-pattern'
    },
    typography: {
      heading: 'Ubuntu',
      body: 'Lato'
    },
    culturalElements: {
      cuisine: ['West African', 'East African', 'North African', 'Ethiopian', 'Moroccan'],
      traditions: ['Communal dining', 'Spice traditions', 'Harvest celebrations'],
      ingredients: ['Yams', 'Plantains', 'Spices', 'Grains', 'Legumes']
    }
  },
  {
    id: 'middle-eastern',
    name: 'middle-eastern',
    displayName: 'Middle Eastern',
    colors: {
      light: createThemeColors('#8E44AD', '#E67E22', '#16A085', ['#8E44AD', '#E67E22', '#16A085']),
      dark: createThemeColors('#AB47BC', '#FF8A65', '#26A69A', ['#AB47BC', '#FF8A65', '#26A69A'], true)
    },
    patterns: {
      background: 'persian-pattern',
      accent: 'geometric-islamic'
    },
    typography: {
      heading: 'Amiri',
      body: 'Noto Sans'
    },
    culturalElements: {
      cuisine: ['Persian', 'Turkish', 'Lebanese', 'Moroccan', 'Israeli'],
      traditions: ['Hospitality', 'Spice markets', 'Tea culture'],
      ingredients: ['Saffron', 'Dates', 'Nuts', 'Herbs', 'Grains']
    }
  },
  {
    id: 'default',
    name: 'default',
    displayName: 'Global Fusion',
    colors: {
      light: createThemeColors('#f97316', '#3b82f6', '#10b981', ['#f97316', '#3b82f6', '#10b981']),
      dark: createThemeColors('#fb923c', '#60a5fa', '#34d399', ['#fb923c', '#60a5fa', '#34d399'], true)
    },
    patterns: {
      background: 'neutral-pattern',
      accent: 'modern-geometric'
    },
    typography: {
      heading: 'Inter',
      body: 'Inter'
    },
    culturalElements: {
      cuisine: ['International', 'Fusion', 'Modern'],
      traditions: ['Global cooking', 'Modern techniques', 'Seasonal eating'],
      ingredients: ['Seasonal produce', 'Global spices', 'Fresh herbs']
    }
  }
];

export const DEFAULT_THEME = CULTURAL_THEMES.find(theme => theme.id === 'default')!;

export const getThemeById = (id: string): CulturalTheme => {
  return CULTURAL_THEMES.find(theme => theme.id === id) || DEFAULT_THEME;
};

export const getThemeByName = (name: string): CulturalTheme => {
  return CULTURAL_THEMES.find(theme => theme.name === name) || DEFAULT_THEME;
};

export const getThemeByCuisine = (cuisine: string): CulturalTheme => {
  return CULTURAL_THEMES.find(theme => 
    theme.culturalElements.cuisine.some(c => 
      c.toLowerCase().includes(cuisine.toLowerCase())
    )
  ) || DEFAULT_THEME;
};