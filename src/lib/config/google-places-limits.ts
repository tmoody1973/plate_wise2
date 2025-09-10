/**
 * Google Places API Cost Control Configuration
 * Helps prevent unexpected charges by setting limits and alerts
 */

export interface CostLimits {
  dailyBudget: number;        // Maximum daily spend in USD
  monthlyBudget: number;      // Maximum monthly spend in USD
  requestsPerMinute: number;  // Rate limit for requests
  requestsPerHour: number;    // Hourly request limit
  enableCaching: boolean;     // Enable response caching
  cacheTimeHours: number;     // Cache duration in hours
  alertThresholds: {
    daily: number;            // Alert when daily spend reaches this %
    monthly: number;          // Alert when monthly spend reaches this %
  };
}

// Default conservative limits
export const DEFAULT_LIMITS: CostLimits = {
  dailyBudget: 5.00,          // $5 per day max
  monthlyBudget: 100.00,      // $100 per month max
  requestsPerMinute: 10,      // 10 requests per minute
  requestsPerHour: 300,       // 300 requests per hour
  enableCaching: true,        // Always cache by default
  cacheTimeHours: 24,         // Cache for 24 hours
  alertThresholds: {
    daily: 80,                // Alert at 80% of daily budget
    monthly: 80               // Alert at 80% of monthly budget
  }
};

// Production limits (more generous)
export const PRODUCTION_LIMITS: CostLimits = {
  dailyBudget: 20.00,
  monthlyBudget: 500.00,
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  enableCaching: true,
  cacheTimeHours: 12,
  alertThresholds: {
    daily: 90,
    monthly: 85
  }
};

// Development limits (very conservative)
export const DEVELOPMENT_LIMITS: CostLimits = {
  dailyBudget: 1.00,          // $1 per day for development
  monthlyBudget: 20.00,       // $20 per month for development
  requestsPerMinute: 5,       // Very limited for testing
  requestsPerHour: 100,
  enableCaching: true,
  cacheTimeHours: 48,         // Longer cache for dev
  alertThresholds: {
    daily: 70,
    monthly: 70
  }
};

/**
 * Get appropriate limits based on environment
 */
export function getCostLimits(): CostLimits {
  const env = process.env.NODE_ENV;
  const customLimits = process.env.GOOGLE_PLACES_LIMITS;
  
  if (customLimits) {
    try {
      return JSON.parse(customLimits);
    } catch (error) {
      console.warn('Invalid GOOGLE_PLACES_LIMITS format, using defaults');
    }
  }
  
  switch (env) {
    case 'production':
      return PRODUCTION_LIMITS;
    case 'development':
      return DEVELOPMENT_LIMITS;
    default:
      return DEFAULT_LIMITS;
  }
}

/**
 * Check if a request would exceed cost limits
 */
export function checkCostLimits(currentDailyCost: number, currentMonthlyCost: number, requestCost: number): {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
} {
  const limits = getCostLimits();
  
  // Check daily limit
  if (currentDailyCost + requestCost > limits.dailyBudget) {
    return {
      allowed: false,
      reason: `Would exceed daily budget of $${limits.dailyBudget}`,
      suggestion: 'Wait until tomorrow or increase daily budget limit'
    };
  }
  
  // Check monthly limit
  if (currentMonthlyCost + requestCost > limits.monthlyBudget) {
    return {
      allowed: false,
      reason: `Would exceed monthly budget of $${limits.monthlyBudget}`,
      suggestion: 'Wait until next month or increase monthly budget limit'
    };
  }
  
  // Check alert thresholds
  const dailyPercentage = ((currentDailyCost + requestCost) / limits.dailyBudget) * 100;
  const monthlyPercentage = ((currentMonthlyCost + requestCost) / limits.monthlyBudget) * 100;
  
  if (dailyPercentage >= limits.alertThresholds.daily) {
    console.warn(`⚠️ Google Places API: ${dailyPercentage.toFixed(1)}% of daily budget used`);
  }
  
  if (monthlyPercentage >= limits.alertThresholds.monthly) {
    console.warn(`⚠️ Google Places API: ${monthlyPercentage.toFixed(1)}% of monthly budget used`);
  }
  
  return { allowed: true };
}

/**
 * Rate limiting helper
 */
class RateLimiter {
  private requests: number[] = [];
  
  canMakeRequest(): boolean {
    const limits = getCostLimits();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Clean old requests
    this.requests = this.requests.filter(time => time > oneHourAgo);
    
    // Check minute limit
    const recentRequests = this.requests.filter(time => time > oneMinuteAgo);
    if (recentRequests.length >= limits.requestsPerMinute) {
      console.warn(`⚠️ Google Places API: Rate limit exceeded (${limits.requestsPerMinute}/min)`);
      return false;
    }
    
    // Check hour limit
    if (this.requests.length >= limits.requestsPerHour) {
      console.warn(`⚠️ Google Places API: Hourly limit exceeded (${limits.requestsPerHour}/hour)`);
      return false;
    }
    
    // Record this request
    this.requests.push(now);
    return true;
  }
}

export const rateLimiter = new RateLimiter();