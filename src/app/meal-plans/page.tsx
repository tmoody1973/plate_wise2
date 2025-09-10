'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
import MealPlannerV2 from '@/components/meal-plans/MealPlannerV2';

export default function MealPlansPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MealPlannerV2 />
      </DashboardLayout>
    </ProtectedRoute>
  );
}