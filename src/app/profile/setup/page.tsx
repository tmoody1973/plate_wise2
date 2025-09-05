/**
 * Profile setup page with comprehensive multi-step wizard
 * Collects cultural preferences, dietary restrictions, budget settings, and more
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileSetupWizard } from '@/components/profile/ProfileSetupWizard';
import { ToastProvider } from '@/components/ui/toast';

export default function ProfileSetupPage() {
  const searchParams = useSearchParams();
  const isUpdate = searchParams.get('update') === 'true';
  
  return (
    <ProtectedRoute>
      <ToastProvider>
        <ProfileSetupWizard isUpdate={isUpdate} />
      </ToastProvider>
    </ProtectedRoute>
  );
}