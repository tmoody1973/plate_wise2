/**
 * Profile setup page with comprehensive multi-step wizard
 * Collects cultural preferences, dietary restrictions, budget settings, and more
 */

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileSetupWizard } from '@/components/profile/ProfileSetupWizard';
import { ToastProvider } from '@/components/ui/toast';

export default function ProfileSetupPage() {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <ProfileSetupWizard isUpdate={false} />
      </ToastProvider>
    </ProtectedRoute>
  );
}