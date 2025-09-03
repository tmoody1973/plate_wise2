/**
 * AI Service Configuration
 * Centralized configuration for all AI-related services
 */

export const AI_CONFIG = {
  // Amazon Bedrock Configuration
  bedrock: {
    region: process.env.AWS_REGION || 'us-east-1',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    maxTokens: 4000,
    temperature: 0.7,
    topP: 0.9,
  },

  // Rate Limiting Configuration
  rateLimiting: {
    maxRequestsPerMinute: 100,
    windowMs: 60000,
    burstLimit: 10,
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    monitoringPeriodMs: 10000,
  },

  // Caching Configuration
  caching: {
    mealPlanTTL: 7200, // 2 hours
    substitutionTTL: 86400, // 24 hours
    translationTTL: 604800, // 1 week
    authenticityTTL: 86400, // 24 hours
  },

  // Prompt Configuration
  prompts: {
    maxPromptLength: 8000,
    culturalContextWeight: 0.8,
    budgetConstraintWeight: 0.9,
    nutritionalWeight: 0.7,
  },

  // Fallback Configuration
  fallbacks: {
    enableFallbacks: true,
    fallbackTimeout: 5000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },
} as const;

/**
 * Environment-specific overrides
 */
export const getAIConfig = () => {
  const env = process.env.NODE_ENV;
  
  if (env === 'development') {
    return {
      ...AI_CONFIG,
      rateLimiting: {
        ...AI_CONFIG.rateLimiting,
        maxRequestsPerMinute: 20, // Lower limit for development
      },
    };
  }
  
  if (env === 'test') {
    return {
      ...AI_CONFIG,
      bedrock: {
        ...AI_CONFIG.bedrock,
        modelId: 'mock-model', // Use mock model for testing
      },
      fallbacks: {
        ...AI_CONFIG.fallbacks,
        enableFallbacks: false, // Disable fallbacks in tests
      },
    };
  }
  
  return AI_CONFIG;
};

/**
 * Validation for AI configuration
 */
export const validateAIConfig = () => {
  const requiredEnvVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for AI service: ${missing.join(', ')}`);
  }
  
  return true;
};