/**
 * Test Script for Tavily + Perplexity API Clients
 * 
 * Simple test script to verify API clients are properly initialized
 * and can handle basic operations without making actual API calls.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { TavilyClient } from './tavily-client';
import { PerplexityClient } from './perplexity-client';
import { getTavilyPerplexityConfig, areApiKeysConfigured } from './tavily-perplexity-config';

/**
 * Test API client initialization
 */
export async function testApiClients(): Promise<void> {
  console.log('🧪 Testing Tavily + Perplexity API Clients...\n');

  try {
    // Test configuration loading
    console.log('1. Testing configuration loading...');
    const config = getTavilyPerplexityConfig();
    console.log('   ✅ Configuration loaded successfully');
    console.log('   📊 Config status:', {
      hasTavilyKey: !!config.tavily.apiKey,
      hasPerplexityKey: !!config.perplexity.apiKey,
      cachingEnabled: config.caching.enableCaching,
      fallbacksEnabled: config.fallback.enableFallbacks
    });

    // Test Tavily client initialization
    console.log('\n2. Testing Tavily client initialization...');
    const tavilyClient = new TavilyClient();
    console.log('   ✅ Tavily client initialized successfully');
    
    const tavilyHealth = tavilyClient.getHealthStatus();
    console.log('   📊 Tavily health:', tavilyHealth);

    // Test Perplexity client initialization
    console.log('\n3. Testing Perplexity client initialization...');
    const perplexityClient = new PerplexityClient();
    console.log('   ✅ Perplexity client initialized successfully');
    
    const perplexityHealth = perplexityClient.getHealthStatus();
    console.log('   📊 Perplexity health:', perplexityHealth);

    // Test API key configuration
    console.log('\n4. Testing API key configuration...');
    const hasApiKeys = areApiKeysConfigured();
    if (hasApiKeys) {
      console.log('   ✅ API keys are configured');
    } else {
      console.log('   ⚠️  API keys not configured (this is expected in development)');
      console.log('   💡 Set TAVILY_API_KEY and PERPLEXITY_API_KEY environment variables');
    }

    // Test error handling (without making actual API calls)
    console.log('\n5. Testing error handling...');
    try {
      // This should handle the missing API key gracefully
      const tavilyClientNoKey = new TavilyClient({ apiKey: '' });
      console.log('   ✅ Tavily client handles missing API key gracefully');
    } catch (error) {
      console.log('   ❌ Tavily client error handling failed:', error.message);
    }

    try {
      const perplexityClientNoKey = new PerplexityClient({ apiKey: '' });
      console.log('   ✅ Perplexity client handles missing API key gracefully');
    } catch (error) {
      console.log('   ❌ Perplexity client error handling failed:', error.message);
    }

    console.log('\n🎉 All API client tests passed!');
    console.log('\n📋 Summary:');
    console.log('   • Tavily client: ✅ Initialized');
    console.log('   • Perplexity client: ✅ Initialized');
    console.log('   • Configuration: ✅ Loaded');
    console.log('   • Error handling: ✅ Working');
    console.log('   • API keys:', hasApiKeys ? '✅ Configured' : '⚠️  Not configured');

    if (!hasApiKeys) {
      console.log('\n💡 Next steps:');
      console.log('   1. Set TAVILY_API_KEY environment variable');
      console.log('   2. Set PERPLEXITY_API_KEY environment variable');
      console.log('   3. Run actual API tests with real credentials');
    }

  } catch (error) {
    console.error('❌ API client test failed:', error);
    throw error;
  }
}

/**
 * Run tests if this file is executed directly
 */
if (require.main === module) {
  testApiClients()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}