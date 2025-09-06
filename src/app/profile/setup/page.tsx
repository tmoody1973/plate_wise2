/**
 * Profile setup page with comprehensive multi-step wizard
 * Collects cultural preferences, dietary restrictions, budget settings, and more
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileSetupWizard } from '@/components/profile/ProfileSetupWizard';
import { ToastProvider } from '@/components/ui/toast';

function ProfileSetupContent() {
  const searchParams = useSearchParams();
  const isUpdate = searchParams.get('update') === 'true';
  
  return <ProfileSetupWizard isUpdate={isUpdate} />;
}

export default function ProfileSetupPage() {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <Suspense fallback={<div className="p-8">Loading...</div>}>
          <ProfileSetupContent />
        </Suspense>
      </ToastProvider>
    </ProtectedRoute>
  );
}