'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface TestAuthProps {
  onAuthSuccess?: (user: any) => void;
  children?: React.ReactNode;
}

export default function TestAuth({ onAuthSuccess, children }: TestAuthProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'existing' | 'anonymous' | 'manual'>('existing');

  const supabase = createClientComponentClient();

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      onAuthSuccess?.(user);
    }
  };

  // Method 1: Try existing test accounts with different emails
  const tryExistingAccounts = async () => {
    setLoading(true);
    setError(null);

    const testAccounts = [
      { email: 'test@platewise.com', password: 'testpassword123' },
      { email: 'demo@platewise.com', password: 'testpassword123' },
      { email: 'user@platewise.com', password: 'testpassword123' },
      { email: 'test1@platewise.com', password: 'testpassword123' },
      { email: 'test2@platewise.com', password: 'testpassword123' }
    ];

    for (const account of testAccounts) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword(account);
        
        if (!error && data.user) {
          setUser(data.user);
          onAuthSuccess?.(data.user);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Continue to next account
      }
    }

    setError('No existing test accounts found. Try anonymous sign-in or manual account.');
    setLoading(false);
  };

  // Method 2: Anonymous authentication (if enabled in Supabase)
  const signInAnonymously = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) throw error;
      
      if (data.user) {
        setUser(data.user);
        onAuthSuccess?.(data.user);
      }
    } catch (error: any) {
      setError('Anonymous sign-in not available. Try manual account creation.');
    } finally {
      setLoading(false);
    }
  };

  // Method 3: Create account with unique timestamp email
  const createUniqueAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const uniqueEmail = `test${timestamp}@platewise.local`;
      
      const { data, error } = await supabase.auth.signUp({
        email: uniqueEmail,
        password: 'testpassword123',
        options: {
          emailRedirectTo: undefined // Skip email confirmation
        }
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        onAuthSuccess?.(data.user);
      }
    } catch (error: any) {
      if (error.message.includes('rate limit')) {
        setError('Rate limit hit. Please wait a few minutes or use existing account method.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Method 4: Direct database user creation (bypass Supabase Auth completely)
  const createDirectUser = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create a completely offline mock user - no Supabase calls
      const mockUser = {
        id: `mock-user-${Date.now()}`,
        email: `test${Date.now()}@platewise.local`,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        isMockUser: true // Flag to identify mock users
      };

      // Store in localStorage for persistence across page reloads
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      
      // Set user immediately - no async Supabase calls
      setUser(mockUser);
      onAuthSuccess?.(mockUser);
      
      console.log('✅ Mock user created successfully (offline):', mockUser.email);
    } catch (error: any) {
      setError(`Mock user creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('mockUser');
    setUser(null);
  };

  if (user) {
    return (
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <p className="text-green-800">
            ✅ Signed in as: {user.email}
          </p>
          <button
            onClick={signOut}
            className="text-green-600 hover:text-green-800 text-sm underline"
          >
            Sign Out
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-4">
        🔐 Authentication Required
      </h3>
      
      <p className="text-yellow-700 mb-4">
        Choose a method to authenticate for testing:
      </p>

      <div className="space-y-3">
        {/* Method 1: Existing Accounts */}
        <button
          onClick={tryExistingAccounts}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading && authMethod === 'existing' ? 'Trying...' : '🔑 Try Existing Test Accounts'}
        </button>

        {/* Method 2: Anonymous */}
        <button
          onClick={signInAnonymously}
          disabled={loading}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading && authMethod === 'anonymous' ? 'Signing in...' : '👤 Anonymous Sign-In'}
        </button>

        {/* Method 3: Unique Account */}
        <button
          onClick={createUniqueAccount}
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading && authMethod === 'manual' ? 'Creating...' : '📧 Create Unique Account'}
        </button>

        {/* Method 4: Mock User (Fallback) */}
        <button
          onClick={createDirectUser}
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          🧪 Mock User (Testing Only)
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mt-4 text-xs text-yellow-600">
        <p><strong>Rate Limited?</strong> Try "Existing Test Accounts" first, then "Mock User" as fallback.</p>
      </div>
    </div>
  );
}