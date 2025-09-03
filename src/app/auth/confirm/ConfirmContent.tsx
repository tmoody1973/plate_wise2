'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function confirm() {
      try {
        const supabase = createClient();
        
        // Get token and type from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'signup') {
          setStatus('error');
          setError('Invalid confirmation link');
          return;
        }

        // Verify the email confirmation token
        const { data, error: confirmError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

        if (confirmError) {
          console.error('Email confirmation error:', confirmError);
          setStatus('error');
          setError(confirmError.message);
          return;
        }

        if (data.user) {
          setStatus('success');
          
          // Redirect to profile setup after a short delay
          setTimeout(() => {
            router.push('/profile/setup' as any);
          }, 2000);
        } else {
          setStatus('error');
          setError('Email confirmation failed');
        }
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Confirmation failed.');
      }
    }

    confirm();
  }, [router, searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirming Your Email</h2>
          <p className="text-gray-600">Please wait while we verify your account...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎉</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been successfully activated. Redirecting to complete your profile…
          </p>
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // status === 'error'
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">❌</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirmation Failed</h2>
        <p className="text-gray-600 mb-6">
          {error || "We couldn't confirm your email address. The link may have expired or is invalid."}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/auth' as any)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Back to Sign In
          </button>
          <button
            onClick={() => {/* TODO: Implement resend confirmation */}}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Resend Confirmation Email
          </button>
        </div>
      </div>
    </div>
  );
}