'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { CulturalTheme } from '@/types';

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeSwitcher({ 
  className = '', 
  showLabels = true, 
  size = 'md' 
}: ThemeSwitcherProps) {
  const { currentTheme, availableThemes, setTheme, isLoading } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const containerSizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${containerSizeClasses[size]} ${className}`}>
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-full`}></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Theme Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${containerSizeClasses[size]} 
          rounded-lg border-2 border-gray-200 
          hover:border-gray-300 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          bg-white shadow-sm hover:shadow-md
        `}
        aria-label="Change cultural theme"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <div
            className={`${sizeClasses[size]} rounded-full border-2 border-white shadow-sm`}
            style={{
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
            }}
          />
          {showLabels && (
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {currentTheme.displayName}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Theme Options Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Cultural Themes</h3>
              <p className="text-xs text-gray-500 mt-1">Choose your culinary heritage</p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {availableThemes.map((theme) => (
                <ThemeOption
                  key={theme.id}
                  theme={theme}
                  isSelected={theme.id === currentTheme.id}
                  onSelect={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ThemeOptionProps {
  theme: CulturalTheme;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeOption({ theme, isSelected, onSelect }: ThemeOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-3 text-left hover:bg-gray-50 transition-colors duration-150
        ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Theme Color Preview */}
        <div className="flex gap-1">
          <div
            className="w-3 h-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: theme.colors.light.primary }}
          />
          <div
            className="w-3 h-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: theme.colors.light.secondary }}
          />
          <div
            className="w-3 h-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: theme.colors.light.accent }}
          />
        </div>
        
        {/* Theme Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
              {theme.displayName}
            </span>
            {isSelected && (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {theme.culturalElements.cuisine.slice(0, 3).join(', ')}
            {theme.culturalElements.cuisine.length > 3 && '...'}
          </p>
        </div>
      </div>
    </button>
  );
}

// Compact version for mobile/small spaces
export function CompactThemeSwitcher({ className = '' }: { className?: string }) {
  return (
    <ThemeSwitcher
      className={className}
      showLabels={false}
      size="sm"
    />
  );
}

// Theme preview component for settings pages
export function ThemePreview({ theme, isSelected, onSelect }: {
  theme: CulturalTheme;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
        }
      `}
    >
      {/* Theme Preview Card */}
      <div
        className="w-full h-24 rounded-md mb-3 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.light.gradient.join(', ')})`
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-10" />
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-white bg-opacity-90 rounded px-2 py-1">
            <div className="text-xs font-medium text-gray-800 truncate">
              {theme.displayName}
            </div>
          </div>
        </div>
      </div>
      
      {/* Theme Details */}
      <div className="text-left">
        <h4 className="font-medium text-gray-900 mb-1">{theme.displayName}</h4>
        <p className="text-xs text-gray-500 line-clamp-2">
          {theme.culturalElements.cuisine.join(', ')}
        </p>
      </div>
      
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}