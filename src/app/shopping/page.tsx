'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function ShoppingPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Smart Shopping</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Generate optimized shopping lists, find the best deals, and discover specialty stores 
              for authentic cultural ingredients in your area.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-cultural-primary/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-primary mb-2">Smart Lists</h3>
                  <p className="text-sm text-gray-600">Auto-generated shopping lists organized by store layout and cultural ingredients</p>
                </div>
                <div className="bg-cultural-secondary/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-secondary mb-2">Store Finder</h3>
                  <p className="text-sm text-gray-600">Locate specialty stores, ethnic markets, and the best deals in your neighborhood</p>
                </div>
                <div className="bg-cultural-accent/10 rounded-lg p-6">
                  <h3 className="font-semibold text-cultural-accent mb-2">Coupon Integration</h3>
                  <p className="text-sm text-gray-600">Automatically find and apply relevant coupons and discounts for maximum savings</p>
                </div>
              </div>
              <Button className="bg-cultural-primary hover:bg-cultural-primary/90 text-white">
                Coming Soon - Smart Shopping Lists!
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}