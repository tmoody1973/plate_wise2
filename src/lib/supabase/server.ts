/**
 * Server-side Supabase client
 * Currently not used in the authentication implementation
 * Will be implemented when server-side features are needed
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // For now, return a browser client
  // This will be properly implemented when server-side auth is needed
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}