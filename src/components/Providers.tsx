'use client'

import React from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UserLocationProvider } from '@/contexts/UserLocationContext'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <UserLocationProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                {children}
              </ToastProvider>
            </QueryClientProvider>
          </UserLocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default Providers
