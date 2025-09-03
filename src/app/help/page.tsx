'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export default function HelpPage() {
  return (
    <ProtectedRoute>
      <ProfileLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">❓</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Help & Support</h1>
              <p className="text-gray-600">
                Get help with PlateWise features, troubleshooting, and cultural cooking guidance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-cultural-primary/10 rounded-lg p-6">
                <h3 className="font-semibold text-cultural-primary mb-3 flex items-center">
                  <span className="mr-2">📚</span>
                  Getting Started
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Setting up your cultural preferences</li>
                  <li>• Understanding budget optimization</li>
                  <li>• Creating your first meal plan</li>
                  <li>• Navigating the recipe collection</li>
                </ul>
              </div>

              <div className="bg-cultural-secondary/10 rounded-lg p-6">
                <h3 className="font-semibold text-cultural-secondary mb-3 flex items-center">
                  <span className="mr-2">🍳</span>
                  Cultural Cooking
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Authentic ingredient sourcing</li>
                  <li>• Traditional cooking techniques</li>
                  <li>• Dietary adaptation guidelines</li>
                  <li>• Cultural authenticity ratings</li>
                </ul>
              </div>

              <div className="bg-cultural-accent/10 rounded-lg p-6">
                <h3 className="font-semibold text-cultural-accent mb-3 flex items-center">
                  <span className="mr-2">💡</span>
                  Tips & Tricks
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Maximizing grocery savings</li>
                  <li>• Meal prep strategies</li>
                  <li>• Seasonal ingredient planning</li>
                  <li>• Leftover utilization</li>
                </ul>
              </div>

              <div className="bg-gray-100 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">🔧</span>
                  Troubleshooting
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Profile setup issues</li>
                  <li>• Theme switching problems</li>
                  <li>• Data export questions</li>
                  <li>• Account management</li>
                </ul>
              </div>
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Need More Help?</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-cultural-primary hover:bg-cultural-primary/90 text-white">
                  📧 Contact Support
                </Button>
                <Button variant="outline" className="border-cultural-secondary text-cultural-secondary hover:bg-cultural-secondary/10">
                  💬 Community Forum
                </Button>
                <Button variant="outline" className="border-cultural-accent text-cultural-accent hover:bg-cultural-accent/10">
                  📖 Documentation
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Support is available in multiple languages to help users from all cultural backgrounds.
              </p>
            </div>
          </div>
        </div>
      </ProfileLayout>
    </ProtectedRoute>
  );
}