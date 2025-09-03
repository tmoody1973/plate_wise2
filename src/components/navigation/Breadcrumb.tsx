'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Generate breadcrumb items from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbItems(pathname);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumb for single items
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2" />
            )}
            
            {index === breadcrumbItems.length - 1 ? (
              // Current page - not clickable
              <span className="flex items-center text-gray-900 font-medium">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              // Clickable breadcrumb item
              <button
                onClick={() => router.push(item.href as any)}
                className="flex items-center text-gray-600 hover:text-cultural-primary transition-colors duration-200"
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Generate breadcrumb items from pathname
function generateBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <HomeIcon className="w-4 h-4" />
    }
  ];

  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip dashboard since it's already added as home
    if (segment === 'dashboard') return;
    
    const label = formatSegmentLabel(segment);
    items.push({
      label,
      href: currentPath,
      icon: getSegmentIcon(segment)
    });
  });

  return items;
}

// Format segment for display
function formatSegmentLabel(segment: string): string {
  const labelMap: Record<string, string> = {
    'meal-plans': 'Meal Plans',
    'recipes': 'Recipes',
    'budget': 'Budget',
    'shopping': 'Shopping',
    'profile': 'Profile',
    'manage': 'Account Settings',
    'setup': 'Profile Setup',
    'help': 'Help & Support',
    'auth': 'Authentication',
    'reset-password': 'Reset Password',
    'confirm': 'Confirm Account'
  };

  return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

// Get icon for segment
function getSegmentIcon(segment: string): React.ReactNode {
  const iconMap: Record<string, string> = {
    'meal-plans': '🍽️',
    'recipes': '📖',
    'budget': '💰',
    'shopping': '🛒',
    'profile': '👤',
    'manage': '⚙️',
    'setup': '✏️',
    'help': '❓',
    'auth': '🔐',
    'reset-password': '🔑',
    'confirm': '✅'
  };

  const emoji = iconMap[segment];
  return emoji ? <span className="text-base">{emoji}</span> : null;
}