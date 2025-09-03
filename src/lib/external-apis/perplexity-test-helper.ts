/**
 * Test helper for enhanced Perplexity cultural pricing service
 */

import { perplexityPricingService } from './perplexity-service';
import type { AdvancedCulturalPricingRequest } from './perplexity-service';

// Integration test helper
export const testPerplexityIntegration = async () => {
  console.log('🧪 Testing Enhanced Perplexity Cultural Pricing Integration...');
  
  const testCases = [
    {
      name: 'Persian Recipe Test',
      request: {
        ingredients: ['saffron', 'sumac', 'pomegranate molasses'],
        location: '90210',
        culturalContext: 'persian',
        budgetLimit: 40,
        prioritizeAuthenticity: true
      }
    },
    {
      name: 'Mexican Recipe Test',
      request: {
        ingredients: ['masa harina', 'dried chiles guajillo'],
        location: '90210',
        culturalContext: 'mexican',
        budgetLimit: 20,
        prioritizeAuthenticity: false
      }
    },
    {
      name: 'Indian Recipe Test',
      request: {
        ingredients: ['ghee', 'paneer', 'curry leaves'],
        location: '90210',
        culturalContext: 'indian',
        budgetLimit: 30,
        prioritizeAuthenticity: true
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Running ${testCase.name}...`);
      const result = await perplexityPricingService.getAdvancedCulturalPricing(testCase.request);
      
      console.log(`✅ ${testCase.name} completed:`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Fallback Used: ${result.fallbackUsed}`);
      console.log(`   - Ingredients Analyzed: ${result.data.length}`);
      console.log(`   - Total Cost: $${result.culturalInsights?.totalEstimatedCost?.toFixed(2) || '0.00'}`);
      console.log(`   - Authenticity Score: ${result.culturalInsights?.authenticityScore?.toFixed(1) || '0.0'}/10`);
      console.log(`   - Ethnic Markets Found: ${result.culturalInsights?.ethnicMarketsFound?.length || 0}`);
      
      if (result.error) {
        console.log(`   - Error: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`❌ ${testCase.name} failed:`, error);
    }
  }
  
  console.log('\n🎉 Enhanced Perplexity Cultural Pricing Integration Test Complete!');
};

// Quick validation test
export const validatePerplexityService = async () => {
  console.log('🔍 Validating Perplexity Service...');
  
  try {
    // Test health check
    const isHealthy = await perplexityPricingService.healthCheck();
    console.log(`Health Check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    // Test basic functionality with fallback
    const basicTest = await perplexityPricingService.getAdvancedCulturalPricing({
      ingredients: ['saffron', 'onion'],
      location: '90210',
      culturalContext: 'persian'
    });
    
    console.log(`Basic Test: ${basicTest.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Fallback Used: ${basicTest.fallbackUsed ? '⚠️ Yes' : '✅ No'}`);
    console.log(`Data Length: ${basicTest.data.length}`);
    
    return { isHealthy, basicTest };
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return { isHealthy: false, basicTest: null };
  }
};