/**
 * Authentication helper functions for PlateWise
 * Provides utilities for user authentication and session management
 */

import { createClient } from '@/lib/supabase/client';
import { AUTH_CONFIG, type AuthProvider } from './auth-config';
import type { User, AuthError } from '@supabase/supabase-js';
import { AuthenticationError, NetworkError } from '@/lib/error-handling/error-types';
import { errorHandler } from '@/lib/error-handling/error-handler';
import { logger } from '@/lib/monitoring/logger';

export interface AuthResult {
  user?: User | null;
  error?: AuthError | Error;
  success: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Client-side authentication helpers
 */
export class AuthHelpers {
  // Lazily create client and fail gracefully when env is missing/misconfigured
  private getClient() {
    try {
      return createClient();
    } catch (e) {
      console.warn('Supabase client unavailable (is NEXT_PUBLIC_SUPABASE_* set?)');
      return null;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp({ email, password, name }: SignUpData): Promise<AuthResult> {
    try {
      const supabase = this.getClient();
      if (!supabase) return { success: false, error: new Error('Supabase not configured') };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}${AUTH_CONFIG.redirectUrls.emailConfirmation}`,
        },
      });

      if (error) {
        return { error, success: false };
      }

      return { user: data.user, success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'), 
        success: false 
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInData): Promise<AuthResult> {
    try {
      const supabase = this.getClient();
      if (!supabase) return { success: false, error: new Error('Supabase not configured') };
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error, success: false };
      }

      return { user: data.user, success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'), 
        success: false 
      };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
    try {
      const supabase = this.getClient();
      if (!supabase) return { success: false, error: new Error('Supabase not configured') };
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}${AUTH_CONFIG.redirectUrls.signIn}`,
          scopes: AUTH_CONFIG.providers[provider].scopes,
        },
      });

      if (error) {
        return { error, success: false };
      }

      return { success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'), 
        success: false 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResult> {
    try {
      const supabase = this.getClient();
      if (!supabase) return { success: true };
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error, success: false };
      }

      return { success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'), 
        success: false 
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const supabase = this.getClient();
      if (!supabase) return { success: false, error: new Error('Supabase not configured') };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${AUTH_CONFIG.redirectUrls.passwordReset}`,
      });

      if (error) {
        return { error, success: false };
      }

      return { success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'), 
        success: false 
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(password: string): Promise<AuthResult> {
    try {
      const supabase = this.getClient();
      if (!supabase) return { success: false, error: new Error('Supabase not configured') };
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error, success: false };
      }

      return { user: data.user, success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'), 
        success: false 
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const supabase = this.getClient();
      if (!supabase) return null;
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // AuthSessionMissingError is expected when no user is signed in
      if (error && error.name === 'AuthSessionMissingError') {
        return null;
      }
      
      if (error) {
        console.error('AuthHelpers: Unexpected error:', error);
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('AuthHelpers: Exception getting current user:', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    const supabase = this.getClient();
    if (!supabase) {
      // Return a no-op subscription when client is unavailable
      return { data: { subscription: { unsubscribe() {} } } } as any;
    }
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }
}

/**
 * Server-side authentication helpers
 * Note: These will be implemented when needed for server components
 */
export class ServerAuthHelpers {
  /**
   * Get current user on server side
   * TODO: Implement when server-side auth is needed
   */
  static async getCurrentUser(): Promise<User | null> {
    // For now, return null - this will be implemented when we need server-side auth
    return null;
  }

  /**
   * Check if user is authenticated on server side
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}

/**
 * Password validation helper
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = AUTH_CONFIG.password;

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Email validation helper
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Export singleton instance for client-side use
export const authHelpers = new AuthHelpers();
