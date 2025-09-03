'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

export interface LogoProps {
  variant?: 'primary' | 'compact' | 'mono' | 'wordmark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  festivalMode?: boolean;
  onClick?: () => void;
}

const LOGO_VARIANTS = {
  primary: '/assets/logo/platewise-logo-primary.svg',
  compact: '/assets/logo/platewise-logo-compact.svg',
  mono: '/assets/logo/platewise-logo-mono.svg',
  wordmark: '/assets/logo/platewise-wordmark.svg',
  white: '/assets/logo/platewise-logo-mono.svg' // Use mono for white variant
};

const SIZE_DIMENSIONS = {
  sm: { width: 80, height: 24 },
  md: { width: 120, height: 36 },
  lg: { width: 160, height: 48 },
  xl: { width: 200, height: 60 }
};

const COMPACT_SIZE_DIMENSIONS = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 },
  xl: { width: 60, height: 60 }
};

export function Logo({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  festivalMode = false,
  onClick 
}: LogoProps) {
  const { currentTheme } = useTheme();
  
  const isCompact = variant === 'compact';
  const dimensions = isCompact ? COMPACT_SIZE_DIMENSIONS[size] : SIZE_DIMENSIONS[size];
  
  const logoClasses = [
    'transition-all duration-300',
    festivalMode ? 'logo-festival-mode' : 'logo-cultural-adaptation',
    onClick ? 'cursor-pointer hover:scale-105' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={logoClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <Image
        src={LOGO_VARIANTS[variant]}
        alt="PlateWise - Cultural Meal Planning & Budget Optimization"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className="w-auto h-auto"
        style={{
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 
                  variant === 'mono' ? 'none' : 
                  `hue-rotate(${getHueRotation(currentTheme.id)}deg)`
        }}
      />
    </div>
  );
}

// Compact logo for mobile/small spaces
export function CompactLogo({ size = 'md', className = '', onClick }: Omit<LogoProps, 'variant'>) {
  return (
    <Logo
      variant="compact"
      size={size}
      className={className}
      onClick={onClick}
    />
  );
}

// Wordmark for text-heavy layouts
export function WordmarkLogo({ size = 'md', className = '', onClick }: Omit<LogoProps, 'variant'>) {
  return (
    <Logo
      variant="wordmark"
      size={size}
      className={className}
      onClick={onClick}
    />
  );
}

// Monochrome logo for single-color applications
export function MonoLogo({ 
  size = 'md', 
  className = '', 
  color = 'currentColor',
  onClick 
}: Omit<LogoProps, 'variant'> & { color?: string }) {
  return (
    <div style={{ color }}>
      <Logo
        variant="mono"
        size={size}
        className={className}
        onClick={onClick}
      />
    </div>
  );
}

// Festival mode logo with special animations
export function FestivalLogo({ variant = 'primary', size = 'md', className = '' }: Omit<LogoProps, 'festivalMode'>) {
  return (
    <Logo
      variant={variant}
      size={size}
      className={className}
      festivalMode={true}
    />
  );
}

// Helper function to get hue rotation based on theme
function getHueRotation(themeId: string): number {
  const rotations: Record<string, number> = {
    'default': 0,
    'mediterranean': 0,
    'asian': 15,
    'latin': 30,
    'african': 45,
    'middle-eastern': 60
  };
  
  return rotations[themeId] || 0;
}

// Logo with cultural context tooltip
export function LogoWithTooltip({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  showTooltip = true 
}: LogoProps & { showTooltip?: boolean }) {
  const { currentTheme } = useTheme();
  
  if (!showTooltip) {
    return <Logo variant={variant} size={size} className={className} />;
  }
  
  return (
    <div className="relative group">
      <Logo variant={variant} size={size} className={className} />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        <div className="font-medium">PlateWise</div>
        <div className="text-xs opacity-75">Theme: {currentTheme.displayName}</div>
        
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}