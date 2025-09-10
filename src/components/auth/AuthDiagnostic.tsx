'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export default function AuthDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const supabase = createClientComponentClient<Database>();

  const addResult = (test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) => {
    setResults(prev => [...prev, { test, status, message, details }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // 1. Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        addResult('Environment', 'fail', 'Missing Supabase environment variables');
      } else {
        addResult('Environment', 'pass', `URL: ${supabaseUrl.slice(0, 30)}..., Key: ${supabaseKey.slice(0, 10)}...`);
      }

      // 2. Handle PKCE callback
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
        addResult('PKCE Exchange', 'pass', 'Code exchange completed (or no code present)');
      } catch (error) {
        addResult('PKCE Exchange', 'warning', 'Code exchange failed (normal if no auth code)', error);
      }

      // 3. Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        addResult('Session Check', 'fail', `Session error: ${sessionError.message}`, sessionError);
      } else if (session) {
        addResult('Session Check', 'pass', `Valid session found. User: ${session.user.email}`, {
          userId: session.user.id,
          expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
          accessToken: session.access_token.slice(0, 20) + '...'
        });
      } else {
        addResult('Session Check', 'warning', 'No active session found');
      }

      // 4. Test database connection
      try {
        const { data, error: dbError } = await supabase
          .from('meal_plans')
          .select('id')
          .limit(1);
        
        if (dbError) {
          addResult('Database Test', 'fail', `DB Error: ${dbError.message}`, dbError);
        } else {
          addResult('Database Test', 'pass', 'Database connection successful');
        }
      } catch (error) {
        addResult('Database Test', 'fail', 'Database connection failed', error);
      }

      // 5. Test API call with auth
      if (session) {
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
            addResult('API Auth Test', 'pass', 'API call with auth successful', data);
          } else {
            const errorText = await response.text();
            addResult('API Auth Test', 'fail', `API call failed: ${response.status}`, errorText);
          }
        } catch (error) {
          addResult('API Auth Test', 'fail', 'API call error', error);
        }
      } else {
        addResult('API Auth Test', 'warning', 'Skipped - no session available');
      }

      // 6. Check localStorage persistence
      const storedSession = localStorage.getItem('supabase.auth.token');
      if (storedSession) {
        addResult('Session Persistence', 'pass', 'Session found in localStorage');
      } else {
        addResult('Session Persistence', 'warning', 'No session in localStorage');
      }

    } catch (error) {
      addResult('General Error', 'fail', 'Diagnostic failed', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🔍 Authentication Diagnostic</h1>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <div>
                    <h3 className="font-semibold">{result.test}</h3>
                    <p className="text-sm">{result.message}</p>
                  </div>
                </div>
                <span className="text-xs font-medium uppercase">
                  {result.status}
                </span>
              </div>
              
              {result.details && (
                <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
                  <strong>Details:</strong>
                  <pre className="mt-1 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-gray-500">
            Click "Run Diagnostics" to check authentication status
          </div>
        )}

        {isRunning && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Running authentication diagnostics...</p>
          </div>
        )}

        {/* Quick Fixes */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🔧 Quick Fixes</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>If you see "Authentication required":</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Check that your redirect URLs are configured in Supabase Auth settings</li>
              <li>Make sure you're using the same domain/port as configured</li>
              <li>Try refreshing the page after signing in</li>
              <li>Check browser console for auth errors</li>
              <li>Verify your API endpoints are receiving the Authorization header</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}