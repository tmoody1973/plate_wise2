'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
import MealPlannerV2 from '@/components/meal-plans/MealPlannerV2';

export default function MealPlansPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {process.env.NEXT_PUBLIC_PLANNER_V3 === 'true' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            New planner preview is enabled. Try it here: <a className="text-blue-700 underline" href="/meal-plans/plan">Open Planner (Preview)</a>
          </div>
        )}
        <MealPlannerV2 />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
