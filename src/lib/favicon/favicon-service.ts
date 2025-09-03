/**
 * Favicon Service for dynamic favicon updates based on cultural themes
 */

import { CulturalTheme } from '@/types';

export class FaviconService {
  private static readonly FAVICON_ID = 'dynamic-favicon';
  
  /**
   * Update favicon based on current cultural theme
   */
  static updateFavicon(theme: CulturalTheme): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Remove existing dynamic favicon
      const existingFavicon = document.getElementById(this.FAVICON_ID);
      if (existingFavicon) {
        existingFavicon.remove();
      }
      
      // Create new favicon with theme colors
      const faviconSvg = this.generateThemedFavicon(theme);
      const faviconBlob = new Blob([faviconSvg], { type: 'image/svg+xml' });
      const faviconUrl = URL.createObjectURL(faviconBlob);
      
      // Create and append new favicon link
      const link = document.createElement('link');
      link.id = this.FAVICON_ID;
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = faviconUrl;
      
      document.head.appendChild(link);
      
      // Clean up previous URL
      setTimeout(() => {
        URL.revokeObjectURL(faviconUrl);
      }, 1000);
      
    } catch (error) {
      console.warn('Failed to update favicon:', error);
    }
  }
  
  /**
   * Generate SVG favicon with theme colors
   */
  private static generateThemedFavicon(theme: CulturalTheme): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="faviconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${theme.colors.light.primary};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${theme.colors.light.secondary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${theme.colors.light.accent};stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Main Plate -->
        <circle cx="16" cy="16" r="14" fill="url(#faviconGradient)"/>
        
        <!-- Inner Ring -->
        <circle cx="16" cy="16" r="10" fill="none" stroke="white" stroke-width="1.5" opacity="0.8"/>
        
        <!-- Center -->
        <circle cx="16" cy="16" r="2" fill="white"/>
        
        <!-- Cultural Pattern -->
        <g opacity="0.4" stroke="white" stroke-width="1" fill="none">
          <path d="M8 6 L16 14 L24 6"/>
          <path d="M8 26 L16 18 L24 26"/>
        </g>
      </svg>
    `;
  }
  
  /**
   * Reset to default favicon
   */
  static resetFavicon(): void {
    if (typeof window === 'undefined') return;
    
    const dynamicFavicon = document.getElementById(this.FAVICON_ID);
    if (dynamicFavicon) {
      dynamicFavicon.remove();
    }
    
    // Restore default favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/assets/logo/favicon/favicon.svg';
    
    document.head.appendChild(link);
  }
  
  /**
   * Generate app icons for mobile devices
   */
  static generateAppIcons(theme: CulturalTheme): void {
    if (typeof window === 'undefined') return;
    
    const sizes = [180, 192, 512];
    
    sizes.forEach(size => {
      const iconSvg = this.generateAppIcon(theme, size);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = size;
      canvas.height = size;
      
      const img = new Image();
      const svgBlob = new Blob([iconSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        
        // Convert to PNG and create link
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            
            // Update or create app icon link
            let link = document.querySelector(`link[sizes="${size}x${size}"]`) as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'apple-touch-icon';
              link.sizes = `${size}x${size}`;
              document.head.appendChild(link);
            }
            
            link.href = pngUrl;
            
            // Clean up
            setTimeout(() => {
              URL.revokeObjectURL(pngUrl);
            }, 1000);
          }
        }, 'image/png');
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    });
  }
  
  /**
   * Generate app icon SVG
   */
  private static generateAppIcon(theme: CulturalTheme, size: number): string {
    const strokeWidth = Math.max(1, size / 32);
    const centerRadius = Math.max(2, size / 16);
    const innerRadius = Math.max(8, size * 0.3);
    const outerRadius = Math.max(12, size * 0.4);
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="appIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${theme.colors.light.primary};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${theme.colors.light.secondary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${theme.colors.light.accent};stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#appIconGradient)"/>
        
        <!-- Main Plate -->
        <circle cx="${size/2}" cy="${size/2}" r="${outerRadius}" fill="white" opacity="0.9"/>
        
        <!-- Inner Ring -->
        <circle cx="${size/2}" cy="${size/2}" r="${innerRadius}" fill="none" stroke="${theme.colors.light.primary}" stroke-width="${strokeWidth}" opacity="0.8"/>
        
        <!-- Center -->
        <circle cx="${size/2}" cy="${size/2}" r="${centerRadius}" fill="${theme.colors.light.primary}"/>
        
        <!-- Cultural Pattern -->
        <g opacity="0.6" stroke="${theme.colors.light.secondary}" stroke-width="${strokeWidth}" fill="none">
          <path d="M${size*0.25} ${size*0.2} L${size/2} ${size*0.4} L${size*0.75} ${size*0.2}"/>
          <path d="M${size*0.25} ${size*0.8} L${size/2} ${size*0.6} L${size*0.75} ${size*0.8}"/>
        </g>
      </svg>
    `;
  }
}