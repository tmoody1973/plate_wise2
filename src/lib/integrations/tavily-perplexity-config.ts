/**
 * Configuration Management for Tavily + Perplexity Integration
 * 
 * Centralized configuration management with:
 * - Environment variable loading
 * - Default value handling
 * - Configuration validation
 * - Runtime configuration updates
 */

import { TavilyPerplexityConfig } from './recipe-types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: TavilyPerplexityConfig = {
  tavily: {
    apiKey: '',
    baseUrl: 'https://api.tavily.com',
    defaultSearchDepth: 'basic',
    maxRetries: 3,
    timeoutMs: 15000,
    qualityThresholds: {
      minTitleLength: 10,
      minContentLength: 100,
      excludePatterns: [
        'youtube.com',
        'tiktok.com',
        'pinterest.com',
        '/collection/',
        '/category/',
        '/search/',
        '/recipes/',
        'recipe-collection',
        'best-recipes',
        'top-recipes',
        'recipe-index',
        'cooking-tips',
        'kitchen-hacks'
      ]
    }
  },
  perplexity: {
    apiKey: '',
    baseUrl: 'https://api.perplexity.ai',
    model: 'sonar-pro',
    maxTokens: 2000,
    temperature: 0.2,
    maxRetries: 3,
    timeoutMs: 30000
  },
  caching: {
    urlDiscoveryTTL: 4 * 60 * 60, // 4 hours in seconds
    recipeParsingTTL: 24 * 60 * 60, // 24 hours in seconds
    enableCaching: true
  },
  fallback: {
    enableFallbacks: true,
    maxFallbackAttempts: 2,
    fallbackSources: ['cache', 'enhanced-recipe-search', 'offline-database']
  }
};

/**
 * Configuration manager class
 */
export class TavilyPerplexityConfigManager {
  private config: TavilyPerplexityConfig;
  private static instance: TavilyPerplexityConfigManager;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TavilyPerplexityConfigManager {
    if (!TavilyPerplexityConfigManager.instance) {
      TavilyPerplexityConfigManager.instance = new TavilyPerplexityConfigManager();
    }
    return TavilyPerplexityConfigManager.instance;
  }

  /**
   * Load configuration from environment variables and defaults
   */
  private loadConfiguration(): TavilyPerplexityConfig {
    return {
      tavily: {
        apiKey: process.env.TAVILY_API_KEY || DEFAULT_CONFIG.tavily.apiKey,
        baseUrl: process.env.TAVILY_BASE_URL || DEFAULT_CONFIG.tavily.baseUrl,
        defaultSearchDepth: (process.env.TAVILY_SEARCH_DEPTH as 'basic' | 'advanced') || DEFAULT_CONFIG.tavily.defaultSearchDepth,
        maxRetries: parseInt(process.env.TAVILY_MAX_RETRIES || '3'),
        timeoutMs: parseInt(process.env.TAVILY_TIMEOUT_MS || '15000'),
        qualityThresholds: {
          minTitleLength: parseInt(process.env.TAVILY_MIN_TITLE_LENGTH || '10'),
          minContentLength: parseInt(process.env.TAVILY_MIN_CONTENT_LENGTH || '100'),
          excludePatterns: process.env.TAVILY_EXCLUDE_PATTERNS 
            ? process.env.TAVILY_EXCLUDE_PATTERNS.split(',')
            : DEFAULT_CONFIG.tavily.qualityThresholds.excludePatterns
        }
      },
      perplexity: {
        apiKey: process.env.PERPLEXITY_API_KEY || DEFAULT_CONFIG.perplexity.apiKey,
        baseUrl: process.env.PERPLEXITY_BASE_URL || DEFAULT_CONFIG.perplexity.baseUrl,
        model: process.env.PERPLEXITY_MODEL || DEFAULT_CONFIG.perplexity.model,
        maxTokens: parseInt(process.env.PERPLEXITY_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.PERPLEXITY_TEMPERATURE || '0.2'),
        maxRetries: parseInt(process.env.PERPLEXITY_MAX_RETRIES || '3'),
        timeoutMs: parseInt(process.env.PERPLEXITY_TIMEOUT_MS || '30000')
      },
      caching: {
        urlDiscoveryTTL: parseInt(process.env.CACHE_URL_DISCOVERY_TTL || '14400'), // 4 hours
        recipeParsingTTL: parseInt(process.env.CACHE_RECIPE_PARSING_TTL || '86400'), // 24 hours
        enableCaching: process.env.ENABLE_CACHING !== 'false'
      },
      fallback: {
        enableFallbacks: process.env.ENABLE_FALLBACKS !== 'false',
        maxFallbackAttempts: parseInt(process.env.MAX_FALLBACK_ATTEMPTS || '2'),
        fallbackSources: process.env.FALLBACK_SOURCES 
          ? process.env.FALLBACK_SOURCES.split(',')
          : DEFAULT_CONFIG.fallback.fallbackSources
      }
    };
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate Tavily configuration
    if (!this.config.tavily.apiKey) {
      console.warn('Tavily API key not found. Set TAVILY_API_KEY environment variable.');
    }

    if (this.config.tavily.maxRetries < 1 || this.config.tavily.maxRetries > 10) {
      errors.push('Tavily maxRetries must be between 1 and 10');
    }

    if (this.config.tavily.timeoutMs < 1000 || this.config.tavily.timeoutMs > 60000) {
      errors.push('Tavily timeoutMs must be between 1000 and 60000');
    }

    // Validate Perplexity configuration
    if (!this.config.perplexity.apiKey) {
      console.warn('Perplexity API key not found. Set PERPLEXITY_API_KEY environment variable.');
    }

    if (this.config.perplexity.maxTokens < 100 || this.config.perplexity.maxTokens > 4000) {
      errors.push('Perplexity maxTokens must be between 100 and 4000');
    }

    if (this.config.perplexity.temperature < 0 || this.config.perplexity.temperature > 1) {
      errors.push('Perplexity temperature must be between 0 and 1');
    }

    // Validate caching configuration
    if (this.config.caching.urlDiscoveryTTL < 300) { // 5 minutes minimum
      errors.push('URL discovery TTL must be at least 300 seconds (5 minutes)');
    }

    if (this.config.caching.recipeParsingTTL < 3600) { // 1 hour minimum
      errors.push('Recipe parsing TTL must be at least 3600 seconds (1 hour)');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): TavilyPerplexityConfig {
    return { ...this.config };
  }

  /**
   * Get Tavily configuration
   */
  public getTavilyConfig() {
    return { ...this.config.tavily };
  }

  /**
   * Get Perplexity configuration
   */
  public getPerplexityConfig() {
    return { ...this.config.perplexity };
  }

  /**
   * Get caching configuration
   */
  public getCachingConfig() {
    return { ...this.config.caching };
  }

  /**
   * Get fallback configuration
   */
  public getFallbackConfig() {
    return { ...this.config.fallback };
  }

  /**
   * Update configuration at runtime
   */
  public updateConfig(updates: Partial<TavilyPerplexityConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      tavily: { ...this.config.tavily, ...updates.tavily },
      perplexity: { ...this.config.perplexity, ...updates.perplexity },
      caching: { ...this.config.caching, ...updates.caching },
      fallback: { ...this.config.fallback, ...updates.fallback }
    };
    
    this.validateConfiguration();
  }

  /**
   * Check if API keys are configured
   */
  public hasRequiredApiKeys(): boolean {
    return !!(this.config.tavily.apiKey && this.config.perplexity.apiKey);
  }

  /**
   * Get configuration status for health checks
   */
  public getConfigStatus() {
    return {
      hasTavilyKey: !!this.config.tavily.apiKey,
      hasPerplexityKey: !!this.config.perplexity.apiKey,
      cachingEnabled: this.config.caching.enableCaching,
      fallbacksEnabled: this.config.fallback.enableFallbacks,
      tavilyModel: this.config.tavily.defaultSearchDepth,
      perplexityModel: this.config.perplexity.model,
      configValid: true
    };
  }

  /**
   * Get environment-specific configuration recommendations
   */
  public getEnvironmentRecommendations(): string[] {
    const recommendations: string[] = [];
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isProduction) {
      if (this.config.perplexity.model === 'sonar') {
        recommendations.push('Consider using sonar-pro model in production for better quality');
      }
      
      if (this.config.tavily.defaultSearchDepth === 'basic') {
        recommendations.push('Consider using advanced search depth in production for better results');
      }
      
      if (!this.config.caching.enableCaching) {
        recommendations.push('Enable caching in production to reduce API costs');
      }
    }

    if (isDevelopment) {
      if (this.config.perplexity.model === 'sonar-pro') {
        recommendations.push('Consider using sonar model in development to reduce costs');
      }
      
      if (this.config.tavily.maxRetries > 2) {
        recommendations.push('Reduce retry attempts in development for faster debugging');
      }
    }

    if (!this.config.tavily.apiKey || !this.config.perplexity.apiKey) {
      recommendations.push('Set API keys in environment variables for full functionality');
    }

    return recommendations;
  }

  /**
   * Export configuration for debugging
   */
  public exportConfig(includeSecrets: boolean = false): any {
    const config = { ...this.config };
    
    if (!includeSecrets) {
      config.tavily.apiKey = config.tavily.apiKey ? '[REDACTED]' : '[NOT SET]';
      config.perplexity.apiKey = config.perplexity.apiKey ? '[REDACTED]' : '[NOT SET]';
    }
    
    return config;
  }
}

/**
 * Convenience function to get configuration instance
 */
export function getTavilyPerplexityConfig(): TavilyPerplexityConfig {
  return TavilyPerplexityConfigManager.getInstance().getConfig();
}

/**
 * Convenience function to check if APIs are configured
 */
export function areApiKeysConfigured(): boolean {
  return TavilyPerplexityConfigManager.getInstance().hasRequiredApiKeys();
}

/**
 * Convenience function to get configuration status
 */
export function getConfigurationStatus() {
  return TavilyPerplexityConfigManager.getInstance().getConfigStatus();
}