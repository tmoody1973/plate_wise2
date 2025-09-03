/**
 * Authentication configuration for PlateWise
 * Handles OAuth providers and authentication settings
 */

export const AUTH_CONFIG = {
  // OAuth provider configurations
  providers: {
    google: {
      enabled: true,
      scopes: 'openid email profile',
    },
    facebook: {
      enabled: true,
      scopes: 'email',
    },
    apple: {
      enabled: true,
      scopes: 'email name',
    },
  },
  
  // Redirect URLs
  redirectUrls: {
    signIn: '/auth/callback',
    signOut: '/',
    emailConfirmation: '/auth/confirm',
    passwordReset: '/auth/reset-password',
  },
  
  // Session configuration
  session: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // 24 hours in seconds
  },
  
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
} as const;

export type AuthProvider = keyof typeof AUTH_CONFIG.providers;