/**
 * Clean, modern authentication page inspired by Airbnb's design
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/logo';
import { LoadingScreen } from '@/components/landing/LoadingScreen';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  const handleAuthSuccess = () => {
    router.push('/profile/setup');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Logo 
              variant="primary" 
              size="md" 
              onClick={() => router.push('/')}
              className="cursor-pointer"
            />
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {mode === 'signin' ? (
            <SignInForm
              onSuccess={handleAuthSuccess}
              onSwitchToSignUp={() => setMode('signup')}
            />
          ) : (
            <SignUpForm
              onSuccess={handleAuthSuccess}
              onSwitchToSignIn={() => setMode('signin')}
            />
          )}
        </div>
      </main>
    </div>
  );
}