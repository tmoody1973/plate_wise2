/**
 * Profile Management Interface Component
 * Provides comprehensive profile editing, data export, and account deletion functionality
 * Implements requirements 9.1-9.5 with real-time updates and privacy compliance
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/lib/profile/profile-service';
import { useToast } from '@/components/ui/toast';
import type { UserProfile } from '@/types';
import { ProfileEditForm } from './ProfileEditForm';
import { DataExportSection } from './DataExportSection';
import { AccountDeletionSection } from './AccountDeletionSection';

interface TabType {
  id: 'edit' | 'export' | 'delete';
  label: string;
  icon: string;
}

const tabs: TabType[] = [
  { id: 'edit', label: 'Profile & Preferences', icon: '👤' },
  { id: 'export', label: 'Export Data', icon: '📥' },
  { id: 'delete', label: 'Delete Account', icon: '🗑️' },
];

export function ProfileManagementInterface() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType['id']>('edit');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile on component mount
  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await profileService.getProfile(user.id);
      
      if (result.success && result.data) {
        setProfile(result.data);
      } else {
        setError(result.error || 'Failed to load profile');
        addToast({
          type: 'error',
          title: 'Load Error',
          message: result.error || 'Failed to load profile',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!user?.id || !profile) return false;

    console.log('ProfileManagementInterface: Updating profile with:', updates); // Debug log

    try {
      const result = await profileService.updateProfile(user.id, updates);
      
      console.log('ProfileManagementInterface: Update result:', result); // Debug log
      
      if (result.success && result.data) {
        setProfile(result.data);
        addToast({
          type: 'success',
          title: 'Success',
          message: 'Profile updated successfully',
        });
        return true;
      } else {
        console.error('ProfileManagementInterface: Update failed:', result.error);
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: result.error || 'Failed to update profile',
        });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('ProfileManagementInterface: Update error:', err);
      addToast({
        type: 'error',
        title: 'Update Error',
        message: errorMessage,
      });
      return false;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex space-x-4 border-b border-gray-200">
            {tabs.map((tab) => (
              <div key={tab.id} className="h-12 w-32 bg-gray-200 rounded-t-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'edit' && (
          <ProfileEditForm
            profile={profile}
            onUpdate={handleProfileUpdate}
            onRefresh={loadProfile}
          />
        )}
        
        {activeTab === 'export' && (
          <DataExportSection
            userId={user?.id || ''}
            profile={profile}
          />
        )}
        
        {activeTab === 'delete' && (
          <AccountDeletionSection
            userId={user?.id || ''}
            profile={profile}
          />
        )}
      </div>
    </div>
  );
}