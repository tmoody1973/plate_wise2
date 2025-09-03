'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function MealPlansPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Meal Planning</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Create culturally-aware meal plans that respect your traditions while optimizing your budget. 
              This feature will be implemented in upcoming tasks.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-cultural-primary/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-primary mb-2">AI-Powered Planning</h3>
                  <p className="text-sm text-gray-600">Get personalized meal suggestions based on your cultural preferences and budget</p>
                </div>
                <div className="bg-cultural-secondary/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-secondary mb-2">Cultural Authenticity</h3>
                  <p className="text-sm text-gray-600">Maintain traditional flavors while adapting to dietary restrictions and budget constraints</p>
                </div>
                <div className="bg-cultural-accent/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-accent mb-2">Smart Shopping</h3>
                  <p className="text-sm text-gray-600">Generate optimized shopping lists with store recommendations and coupon integration</p>
                </div>
              </div>
              <Button className="bg-cultural-primary hover:bg-cultural-primary/90 text-white">
                Coming Soon - Stay Tuned!
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}