// Cultural themes configuration
export const CULTURAL_THEMES = {
  mediterranean: {
    name: 'Mediterranean',
    colors: {
      primary: '#E67E22',
      secondary: '#27AE60',
      accent: '#3498DB',
      gradient: ['#E67E22', '#F39C12', '#27AE60']
    },
    patterns: {
      background: 'olive-branch-pattern',
      accent: 'geometric-tiles'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro'
    }
  },
  asian: {
    name: 'Asian',
    colors: {
      primary: '#E74C3C',
      secondary: '#F39C12',
      accent: '#8E44AD',
      gradient: ['#E74C3C', '#F39C12', '#8E44AD']
    },
    patterns: {
      background: 'bamboo-pattern',
      accent: 'wave-pattern'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro'
    }
  },
  latin: {
    name: 'Latin American',
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      accent: '#45B7D1',
      gradient: ['#FF6B6B', '#4ECDC4', '#45B7D1']
    },
    patterns: {
      background: 'aztec-pattern',
      accent: 'textile-pattern'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro'
    }
  },
  african: {
    name: 'African',
    colors: {
      primary: '#D35400',
      secondary: '#27AE60',
      accent: '#F1C40F',
      gradient: ['#D35400', '#27AE60', '#F1C40F']
    },
    patterns: {
      background: 'kente-pattern',
      accent: 'tribal-pattern'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro'
    }
  },
  'middle-eastern': {
    name: 'Middle Eastern',
    colors: {
      primary: '#8E44AD',
      secondary: '#E67E22',
      accent: '#16A085',
      gradient: ['#8E44AD', '#E67E22', '#16A085']
    },
    patterns: {
      background: 'arabesque-pattern',
      accent: 'geometric-islamic'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Source Sans Pro'
    }
  }
} as const;

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  zh: { name: 'Chinese', nativeName: '中文', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
  he: { name: 'Hebrew', nativeName: 'עברית', rtl: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  ur: { name: 'Urdu', nativeName: 'اردو', rtl: true },
} as const;

// Dietary restrictions
export const DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'soy-free',
  'egg-free',
  'shellfish-free',
  'kosher',
  'halal',
  'keto',
  'paleo',
  'low-carb',
  'low-sodium',
  'diabetic-friendly'
] as const;

// Cultural cuisines
export const CULTURAL_CUISINES = [
  'mediterranean',
  'italian',
  'greek',
  'spanish',
  'french',
  'middle-eastern',
  'lebanese',
  'turkish',
  'persian',
  'moroccan',
  'asian',
  'chinese',
  'japanese',
  'korean',
  'thai',
  'vietnamese',
  'indian',
  'pakistani',
  'bangladeshi',
  'latin-american',
  'mexican',
  'peruvian',
  'brazilian',
  'argentinian',
  'colombian',
  'african',
  'ethiopian',
  'nigerian',
  'south-african',
  'moroccan',
  'caribbean',
  'jamaican',
  'cuban',
  'puerto-rican',
  'american',
  'southern',
  'cajun',
  'tex-mex'
] as const;

// Cooking skill levels
export const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Basic cooking skills, simple recipes' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with most techniques' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced cook, complex recipes' }
] as const;

// Activity levels for nutritional calculations
export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { value: 'lightly-active', label: 'Lightly Active', multiplier: 1.375 },
  { value: 'moderately-active', label: 'Moderately Active', multiplier: 1.55 },
  { value: 'very-active', label: 'Very Active', multiplier: 1.725 },
  { value: 'extremely-active', label: 'Extremely Active', multiplier: 1.9 }
] as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  USER_DATA: 3600, // 1 hour
  RECIPE_DATA: 86400, // 24 hours
  PRICING_DATA: 1800, // 30 minutes
  AI_SUGGESTIONS: 7200, // 2 hours
  LOCATION_DATA: 43200, // 12 hours
  NUTRITION_DATA: 86400, // 24 hours
  STORE_DATA: 21600, // 6 hours
} as const;

// API endpoints
export const API_ENDPOINTS = {
  KROGER: 'https://api.kroger.com/v1',
  SPOONACULAR: 'https://api.spoonacular.com',

  ELEVENLABS: 'https://api.elevenlabs.io/v1',
  GOOGLE_PLACES: 'https://maps.googleapis.com/maps/api/place',
  USDA: 'https://www.usda.gov/api'
} as const;

// Bento card sizes
export const BENTO_SIZES = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-1',
  large: 'col-span-2 row-span-2',
  wide: 'col-span-3 row-span-1',
  tall: 'col-span-1 row-span-2',
  hero: 'col-span-4 row-span-2'
} as const;

// Default budget categories
export const BUDGET_CATEGORIES = {
  produce: { name: 'Produce', color: '#27AE60', percentage: 30 },
  meat: { name: 'Meat & Seafood', color: '#E74C3C', percentage: 25 },
  dairy: { name: 'Dairy & Eggs', color: '#3498DB', percentage: 15 },
  pantry: { name: 'Pantry Staples', color: '#F39C12', percentage: 20 },
  specialty: { name: 'Specialty Items', color: '#8E44AD', percentage: 10 }
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  API_ERROR: 'Service temporarily unavailable. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  AUTH_ERROR: 'Authentication failed. Please log in again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.'
} as const;