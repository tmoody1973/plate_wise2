'use client';

import AuthWrapper from '@/components/auth/AuthWrapper';
import { useState } from 'react';

export default function TestAuthFixPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAuthenticatedAPI = async (session: any) => {
    if (!session) {
      setTestResult('❌ No session available');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-db', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ API call successful: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        setTestResult(`❌ API call failed (${response.status}): ${errorText}`);
      }
    } catch (error) {
      setTestResult(`❌ API call error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        <AuthWrapper>
          {({ user, session, loading: authLoading, signOut }) => (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold mb-6">🔧 Authentication Fix Test</h1>
              
              {authLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2">Loading authentication...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Auth Status */}
                  <div className={`p-4 rounded-lg ${user ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <h2 className="font-semibold mb-2">Authentication Status</h2>
                    {user ? (
                      <div className="text-green-800">
                        <p>✅ <strong>Signed in as:</strong> {user.email}</p>
                        <p>🆔 <strong>User ID:</strong> {user.id}</p>
                        <p>⏰ <strong>Session expires:</strong> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Unknown'}</p>
                      </div>
                    ) : (
                      <div className="text-red-800">
                        <p>❌ Not authenticated</p>
                        <p>Please sign in to test the authentication fix</p>
                      </div>
                    )}
                  </div>

                  {/* Test API Call */}
                  {user && (
                    <div className="space-y-4">
                      <button
                        onClick={() => testAuthenticatedAPI(session)}
                        disabled={loading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {loading ? 'Testing...' : 'Test Authenticated API Call'}
                      </button>

                      {testResult && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h3 className="font-semibold mb-2">API Test Result:</h3>
                          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-4">
                    {user ? (
                      <button
                        onClick={signOut}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <a
                        href="/sign-in"
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Sign In
                      </a>
                    )}
                    
                    <a
                      href="/auth-diagnostic"
                      className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    >
                      Run Full Diagnostic
                    </a>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">🔍 How to Test:</h3>
                    <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                      <li>Sign in using the "Sign In" button</li>
                      <li>Check that the authentication status shows as signed in</li>
                      <li>Click "Test Authenticated API Call" to verify the session works</li>
                      <li>If you see "Authentication required" errors, run the full diagnostic</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </AuthWrapper>
      </div>
    </div>
  );
}