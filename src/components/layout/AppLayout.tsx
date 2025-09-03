'use client';

import React from 'react';
import { MainNavigation, SimpleNavigation } from './MainNavigation';
import { ProtectedPage } from './RouteProtection';

interface AppLayoutProps {
  children: React.ReactNode;
  variant?: 'full' | 'simple';
  className?: string;
  showBreadcrumb?: boolean;
  requireAuth?: boolean;
}

export function AppLayout({ 
  children, 
  variant = 'full', 
  className = '', 
  showBreadcrumb = true,
  requireAuth = true 
}: AppLayoutProps) {
  const NavigationComponent = variant === 'full' ? MainNavigation : SimpleNavigation;
  
  const content = (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <NavigationComponent showBreadcrumb={showBreadcrumb} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );

  if (requireAuth) {
    return <ProtectedPage>{content}</ProtectedPage>;
  }

  return content;
}

// Specific layout for dashboard and main app pages
export function DashboardLayout({ 
  children, 
  className = '',
  showBreadcrumb = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  showBreadcrumb?: boolean;
}) {
  return (
    <AppLayout variant="full" className={className} showBreadcrumb={showBreadcrumb}>
      {children}
    </AppLayout>
  );
}

// Layout for profile and settings pages
export function ProfileLayout({ 
  children, 
  className = '',
  showBreadcrumb = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  showBreadcrumb?: boolean;
}) {
  return (
    <AppLayout variant="simple" className={className} showBreadcrumb={showBreadcrumb}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </AppLayout>
  );
}

// Layout for setup and onboarding pages (no navigation)
export function SetupLayout({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${className}`}>
      {children}
    </div>
  );
}

// Layout for pages that don't require authentication
export function PublicLayout({ 
  children, 
  className = '',
  variant = 'simple' 
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'full' | 'simple';
}) {
  return (
    <AppLayout 
      variant={variant} 
      className={className} 
      requireAuth={false}
      showBreadcrumb={false}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </AppLayout>
  );
}