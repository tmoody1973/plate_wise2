'use client';

import React from 'react';
import { Logo } from '@/components/ui/logo';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Logo variant="primary" size="lg" className="mb-8" />
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-orange-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-gray-600 font-medium text-lg">Loading PlateWise...</p>
        <p className="text-gray-400 text-sm mt-2">Preparing your culinary journey</p>
      </div>
    </div>
  );
}