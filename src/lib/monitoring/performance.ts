/**
 * Performance monitoring utilities for PlateWise
 * Tracks page load times, API calls, and user interactions
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: Date;
  context?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  // Start timing an operation
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  // End timing and record the metric
  endTimer(name: string, context?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      context,
    });

    return duration;
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Log performance metrics
    logger.info(`Performance: ${metric.name} = ${metric.value}${metric.unit}`, {
      component: 'performance',
      metadata: metric.context,
    });

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Get all recorded metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Measure Web Vitals
  measureWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          unit: 'ms',
          timestamp: new Date(),
        });
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          unit: 'ms',
          timestamp: new Date(),
        });
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.recordMetric({
        name: 'CLS',
        value: clsValue,
        unit: 'count',
        timestamp: new Date(),
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Monitor API calls
  async measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const timerName = `api_${name}`;
    this.startTimer(timerName);

    try {
      const result = await apiCall();
      const duration = this.endTimer(timerName, { ...context, status: 'success' });
      
      logger.apiCall(name, 'unknown', duration, 200);
      return result;
    } catch (error) {
      const duration = this.endTimer(timerName, { ...context, status: 'error' });
      
      logger.apiCall(name, 'unknown', duration, 500);
      throw error;
    }
  }

  // Monitor component render times
  measureComponentRender(componentName: string, renderFn: () => void): void {
    const timerName = `render_${componentName}`;
    this.startTimer(timerName);
    
    renderFn();
    
    this.endTimer(timerName, { component: componentName });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize Web Vitals monitoring when in browser
if (typeof window !== 'undefined') {
  performanceMonitor.measureWebVitals();
}