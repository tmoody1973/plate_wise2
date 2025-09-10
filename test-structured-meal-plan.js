#!/usr/bin/env node

/**
 * Test script for structured Perplexity meal plan generation
 * Run with: node test-structured-meal-plan.js
 */

const BASE_URL = 'http://localhost:3000';

async function testStructuredMealPlan() {
  console.log('🧪 Testing Structured Perplexity Meal Plan Generation');
  console.log('=' .repeat(60));

  try {
    console.log('📡 Making request to test endpoint...');
    
    const response = await fetch(`${BASE_URL}/api/meal-plans/test-structured`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Test completed successfully!');
      console.log('\n📊 Performance Metrics:');
      console.log(`   Generation Time: ${result.data.performance.generationTime}ms`);
      console.log(`   Recipe Count: ${result.data.performance.recipeCount}`);
      console.log(`   Budget Utilization: ${result.data.performance.budgetUtilization.toFixed(1)}%`);

      console.log('\n🍽️ Generated Recipes:');
      result.data.mealPlan.recipes.forEach((recipe, index) => {
        console.log(`   ${index + 1}. ${recipe.title}`);
        console.log(`      Culture: ${recipe.culturalOrigin.join(', ')}`);
        console.log(`      Cost: $${recipe.metadata.estimatedCost.toFixed(2)}`);
        console.log(`      Time: ${recipe.metadata.totalTimeMinutes} min`);
        console.log(`      Authenticity: ${recipe.culturalAuthenticity}`);
      });

      console.log('\n🛒 Shopping Insights:');
      console.log(`   Total Items: ${result.data.mealPlan.shoppingList.length}`);
      console.log(`   Total Cost: $${result.data.mealPlan.totalEstimatedCost.toFixed(2)}`);
      console.log(`   Savings: $${result.data.mealPlan.savings.totalSavings.toFixed(2)}`);

      console.log('\n🏪 Cultural Balance:');
      Object.entries(result.data.mealPlan.culturalBalance).forEach(([cuisine, percentage]) => {
        console.log(`   ${cuisine}: ${percentage}%`);
      });

    } else {
      console.error('❌ Test failed:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your Next.js development server is running:');
      console.log('   npm run dev');
    }
  }
}

// Run the test
testStructuredMealPlan();