'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-2xl mb-4">🔄</div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setMessage('✅ Signed in successfully!');
        // Redirect to main app dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Common test accounts that might exist
  const tryCommonAccount = async (email: string, password: string) => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        setMessage(`✅ Signed in as ${email}!`);
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (error: any) {
      setMessage(`❌ ${email}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Sign In to PlateWise
        </h1>

        {/* Manual Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or try common test accounts</span>
          </div>
        </div>

        {/* Common Test Accounts */}
        <div className="space-y-2 mb-6">
          <button
            onClick={() => tryCommonAccount('test@platewise.com', 'testpassword123')}
            disabled={loading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-sm disabled:opacity-50"
          >
            Try: test@platewise.com
          </button>
          
          <button
            onClick={() => tryCommonAccount('demo@platewise.com', 'testpassword123')}
            disabled={loading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-sm disabled:opacity-50"
          >
            Try: demo@platewise.com
          </button>
          
          <button
            onClick={() => tryCommonAccount('user@platewise.com', 'testpassword123')}
            disabled={loading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-sm disabled:opacity-50"
          >
            Try: user@platewise.com
          </button>
        </div>

        {/* Alternative Options */}
        <div className="space-y-2">
          <button
            onClick={() => router.push('/working-demo')}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 text-sm"
          >
            🚀 Skip to Working Demo (No Auth)
          </button>
          
          <button
            onClick={() => router.push('/demo-offline')}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 text-sm"
          >
            📱 Offline Demo (No Auth)
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('✅')
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p><strong>Have an existing account?</strong> Enter your email/password above</p>
          <p><strong>Hit rate limit?</strong> Try the "Working Demo" or "Offline Demo" options</p>
          <p><strong>Need help?</strong> The demo versions show all features without authentication</p>
        </div>
      </div>
    </div>
  );
}
