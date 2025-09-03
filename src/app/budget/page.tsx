'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function BudgetPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Budget Tracking</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Track your grocery spending, set budget goals, and get insights on how to save money 
              while maintaining your cultural food preferences.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-cultural-primary/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-primary mb-2">Spending Analytics</h3>
                  <p className="text-sm text-gray-600">Visualize your grocery spending patterns and identify areas for savings</p>
                </div>
                <div className="bg-cultural-secondary/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-secondary mb-2">Budget Goals</h3>
                  <p className="text-sm text-gray-600">Set monthly limits and get alerts when approaching your budget thresholds</p>
                </div>
                <div className="bg-cultural-accent/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-accent mb-2">Smart Savings</h3>
                  <p className="text-sm text-gray-600">Get personalized recommendations for cost-effective ingredient substitutions</p>
                </div>
              </div>
              <Button className="bg-cultural-primary hover:bg-cultural-primary/90 text-white">
                Coming Soon - Budget Optimization!
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}