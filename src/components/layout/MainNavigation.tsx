'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { Logo } from '@/components/ui/logo';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { 
  Bars3Icon, 
  XMarkIcon, 
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface MainNavigationProps {
  className?: string;
  showBreadcrumb?: boolean;
}

export function MainNavigation({ className = '', showBreadcrumb = true }: MainNavigationProps) {
  const { user, signOut } = useAuthContext();
  const { currentTheme } = useProfileTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/');
    }
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard' as const, description: 'Overview and quick actions' },
    { name: 'Meal Plans', href: '/meal-plans' as const, description: 'Plan your weekly meals' },
    { name: 'Recipes', href: '/recipes' as const, description: 'Discover cultural recipes' },
    { name: 'Budget', href: '/budget' as const, description: 'Track grocery spending' },
    { name: 'Shopping', href: '/shopping' as const, description: 'Manage shopping lists' },
  ];

  const isActivePath = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <header className={`bg-white border-b border-gray-100 sticky top-0 z-40 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Main Navigation */}
            <div className="flex items-center space-x-8">
              <Logo 
                variant="primary" 
                size="md" 
                onClick={() => router.push('/dashboard')}
                className="hover:scale-105 transition-transform cursor-pointer logo-cultural-adaptation"
              />
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    title={item.description}
                    className={`
                      px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 relative
                      ${isActivePath(item.href)
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Side - Theme Switcher, Profile, and Actions */}
            <div className="flex items-center space-x-3">
              {/* Theme Switcher */}
              <div className="hidden sm:block">
                <ThemeSwitcher />
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cultural-primary rounded-lg p-2 transition-colors"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-cultural-gradient rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md">
                    {(user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-24 truncate">
                    {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isProfileMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-cultural-primary/5 to-cultural-secondary/5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-cultural-gradient rounded-full flex items-center justify-center text-white font-medium">
                            {(user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user?.user_metadata?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user?.email}
                            </p>
                            <p className="text-xs text-cultural-primary font-medium">
                              {currentTheme.displayName} Theme
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="py-2">
                        <button
                          onClick={() => {
                            router.push('/profile/manage');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-3 text-gray-400" />
                          Profile Settings
                        </button>
                        
                        <button
                          onClick={() => {
                            router.push('/profile/setup?update=true');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        >
                          <UserCircleIcon className="w-4 h-4 mr-3 text-gray-400" />
                          Update Preferences
                        </button>
                        
                        <button
                          onClick={() => {
                            router.push('/help');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        >
                          <QuestionMarkCircleIcon className="w-4 h-4 mr-3 text-gray-400" />
                          Help & Support
                        </button>
                        
                        <div className="border-t border-gray-100 my-2"></div>
                        
                        <button
                          onClick={() => {
                            void handleSignOut();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3 text-red-500" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cultural-primary transition-colors"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200
                      ${isActivePath(item.href)
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div>
                      <div>{item.name}</div>
                      <div className={`text-xs ${isActivePath(item.href) ? 'text-white/70' : 'text-gray-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
                
                {/* Mobile Theme Switcher */}
                <div className="px-4 py-3 border-t border-gray-200 mt-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Theme</div>
                  <ThemeSwitcher />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {showBreadcrumb && pathname !== '/dashboard' && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumb />
          </div>
        </div>
      )}
    </>
  );
}

// Simplified navigation for pages that don't need full navigation
export function SimpleNavigation({ className = '', showBreadcrumb = false }: MainNavigationProps) {
  const { user, signOut } = useAuthContext();
  const { currentTheme } = useProfileTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/');
    }
  };

  return (
    <>
      <header className={`bg-white border-b border-gray-100 sticky top-0 z-40 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Logo 
              variant="primary" 
              size="md" 
              onClick={() => router.push('/dashboard')}
              className="hover:scale-105 transition-transform cursor-pointer logo-cultural-adaptation"
            />
            
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
              
              <Button
                onClick={() => router.push('/profile/manage')}
                variant="outline"
                size="sm"
                className="border-cultural-primary/20 text-cultural-primary hover:bg-cultural-primary hover:text-white"
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Profile
              </Button>
              
              <Button
                onClick={() => void handleSignOut()}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {showBreadcrumb && pathname !== '/dashboard' && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumb />
          </div>
        </div>
      )}
    </>
  );
}
