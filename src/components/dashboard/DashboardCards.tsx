'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { useAuthContext } from '@/contexts/AuthContext';

interface DashboardCardsProps {
  className?: string;
}

export function DashboardCards({ className = '' }: DashboardCardsProps) {
  const router = useRouter();
  const { currentTheme } = useProfileTheme();
  const { user } = useAuthContext();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {/* Welcome Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">
          Good morning, {userName}
        </h1>
        <p className="text-xl text-gray-600">
          Ready to plan some delicious meals?
        </p>
      </div>

      {/* Quick Actions Section */}
      <div className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Plan Meals */}
          <div 
            onClick={() => router.push('/meal-plans')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan meals</h3>
            <p className="text-gray-600 text-sm">Create weekly meal plans that fit your budget and cultural preferences</p>
          </div>

          {/* Find Recipes */}
          <div 
            onClick={() => router.push('/recipes')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find recipes</h3>
            <p className="text-gray-600 text-sm">Discover authentic recipes from your cultural heritage and beyond</p>
          </div>

          {/* Track Budget */}
          <div 
            onClick={() => router.push('/budget')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Track budget</h3>
            <p className="text-gray-600 text-sm">Monitor your grocery spending and optimize your food budget</p>
          </div>

          {/* Shopping Lists */}
          <div 
            onClick={() => router.push('/shopping')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopping lists</h3>
            <p className="text-gray-600 text-sm">Create and manage smart shopping lists with price comparisons</p>
          </div>
        </div>
      </div>

      {/* Cultural Spotlight */}
      <div className="mb-12">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold mb-3">Explore {currentTheme.displayName} cuisine</h2>
            <p className="text-white/90 mb-6 text-lg">
              {getCulturalDescription(currentTheme.id)}
            </p>
            <button 
              onClick={() => router.push(`/recipes?cuisine=${currentTheme.id}`)}
              className="bg-white text-gray-900 px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Discover recipes
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Budget</h3>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">$0</div>
            <div className="text-sm text-gray-600">of $500 spent</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
          <button 
            onClick={() => router.push('/budget')}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Set up budget →
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Meal Plans</h3>
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">active plans</div>
          </div>
          <div className="text-sm text-gray-500 mb-4">No meal plans created yet</div>
          <button 
            onClick={() => router.push('/meal-plans')}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Create your first plan →
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Saved Recipes</h3>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">recipes saved</div>
          </div>
          <div className="text-sm text-gray-500 mb-4">Start exploring recipes</div>
          <button 
            onClick={() => router.push('/recipes')}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Browse recipes →
          </button>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => router.push('/profile/setup?step=nutritional-goals')}
            className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">Nutritional goals</div>
            <div className="text-sm text-gray-600">Set your daily calorie and macro targets</div>
          </button>
          <button 
            onClick={() => router.push('/profile/manage')}
            className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">Profile settings</div>
            <div className="text-sm text-gray-600">Update your preferences and account details</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions for cultural content
function getCulturalEmoji(themeId: string): string {
  const emojiMap: Record<string, string> = {
    mediterranean: '🫒',
    asian: '🥢',
    latin: '🌶️',
    african: '🌍',
    'middle-eastern': '🕌',
    default: '🍽️'
  };
  return emojiMap[themeId] || emojiMap.default || '🍽️';
}

function getCulturalDescription(themeId: string): string {
  const descriptionMap: Record<string, string> = {
    mediterranean: 'Fresh ingredients, olive oil, and vibrant flavors from the Mediterranean coast.',
    asian: 'Balance, harmony, and diverse cooking techniques from across Asia.',
    latin: 'Bold spices, fresh herbs, and rich traditions from Latin America.',
    african: 'Diverse flavors and ancient cooking traditions from across Africa.',
    'middle-eastern': 'Aromatic spices, hospitality, and time-honored recipes.',
    default: 'Discover the rich culinary traditions that inspire your cooking.'
  };
  return descriptionMap[themeId] || descriptionMap.default || 'Discover the rich culinary traditions that inspire your cooking.';
}