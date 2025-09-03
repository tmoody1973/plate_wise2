/**
 * Dashboard page - main application interface after authentication
 * Protected route that requires user authentication with bento-style layout
 */

'use client';

import { useRequireProfileSetup } from '@/hooks/useProfileSetup';
import { DashboardLayout } from '@/components/layout/AppLayout';
import { DashboardCards } from '@/components/dashboard/DashboardCards';
import { LoadingPage } from '@/components/ui/loading';
import { RecipeRecommendations } from '@/components/dashboard/RecipeRecommendations';

export default function DashboardPage() {
  const { isLoading: setupLoading, hasCompletedSetup } = useRequireProfileSetup();

  // Show loading while checking setup status
  if (setupLoading) {
    return <LoadingPage message="Loading your dashboard..." />;
  }

  // Show redirect message if setup is not complete
  if (hasCompletedSetup === false) {
    return <LoadingPage message="Redirecting to profile setup..." />;
  }

  return (
    <DashboardLayout showBreadcrumb={false}>
      <div className="bg-gray-50 min-h-screen">
        <DashboardCards />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <RecipeRecommendations />
        </div>
      </div>
    </DashboardLayout>
  );
}
