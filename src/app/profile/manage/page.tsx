/**
 * Profile management page - allows users to edit profile, export data, and delete account
 * Implements requirements 9.1-9.5 for user profile and preference management
 */

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileManagementInterface } from '@/components/profile/ProfileManagementInterface';
import { ToastProvider } from '@/components/ui/toast';
import { ProfileLayout } from '@/components/layout/AppLayout';

export default function ProfileManagePage() {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <ProfileLayout>
          <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
            <div className="px-6 py-8 border-b border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
              <p className="mt-2 text-gray-600">
                Manage your profile, food preferences, account data, and privacy settings
              </p>
            </div>
            <ProfileManagementInterface />
          </div>
        </ProfileLayout>
      </ToastProvider>
    </ProtectedRoute>
  );
}