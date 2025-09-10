'use client';

import { useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/types/database';

interface AuthWrapperProps {
  children: (props: {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
  }) => ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Handle PKCE callback
        if (typeof window !== 'undefined') {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } catch (error) {
            // Expected to fail if no code
            console.debug('No auth code to exchange');
          }
        }

        // Get session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        }

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (mounted) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setLoading(false);
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) setLoading(false);
      }
    }

    const cleanup = initAuth();
    return () => {
      mounted = false;
      cleanup.then(fn => fn?.());
    };
  }, [supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {children({ user, session, loading, signOut })}
    </>
  );
}