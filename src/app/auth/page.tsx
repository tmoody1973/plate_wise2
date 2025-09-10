'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          setMessage('Account created successfully! You can now sign in.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          setMessage('Signed in successfully!');
          setUser(data.user);
          // Redirect to main app dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessage('Signed out successfully');
  };

  const useTestAccount = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Try to sign in with test account
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@platewise.com',
        password: 'testpassword123'
      });

      if (error) {
        // If sign in fails, create the test account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test@platewise.com',
          password: 'testpassword123'
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          setMessage('Test account created and signed in!');
          setUser(signUpData.user);
        }
      } else {
        setMessage('Signed in with test account!');
        setUser(data.user);
      }

      // Redirect to main app dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Welcome!</h1>
          
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800 text-center">
              ✅ Signed in as: {user.email}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 font-medium"
            >
              Go to Meal Plans Demo
            </button>

            <button
              onClick={() => router.push('/test-database')}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 font-medium"
            >
              Go to Database Tests
            </button>

            <button
              onClick={signOut}
              className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          PlateWise Authentication
        </h1>

        {/* Quick Test Button */}
        <div className="mb-6">
          <button
            onClick={useTestAccount}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
          >
            {loading ? 'Setting up...' : '🚀 Quick Test (Auto Sign-In)'}
          </button>
          <p className="text-sm text-gray-600 text-center mt-2">
            Creates/signs in with test@platewise.com automatically
          </p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or use custom account</span>
          </div>
        </div>

        {/* Manual Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
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
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('successfully') || message.includes('✅')
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
