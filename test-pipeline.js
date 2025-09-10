#!/usr/bin/env node

async function testPipeline() {
  try {
    console.log('🧪 Testing Stage 1 + Stage 2 Pipeline...');
    
    const response = await fetch('http://localhost:3000/api/meal-plans/test-pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        numberOfMeals: 2,
        culturalCuisines: ['Mexican'],
        dietaryRestrictions: ['halal_friendly'],
        householdSize: 4,
        maxTime: 45
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Pipeline test successful!');
      console.log('📊 Results:', {
        recipeCount: data.mealPlan.recipes.length,
        totalCost: data.mealPlan.totalCost,
        confidence: data.mealPlan.confidence
      });
      
      console.log('\n🍽️ Generated Recipes:');
      data.mealPlan.recipes.forEach((recipe, index) => {
        console.log(`${index + 1}. ${recipe.title}`);
        console.log(`   🌍 Cuisine: ${recipe.cuisine}`);
        console.log(`   🔗 Source: ${recipe.sourceUrl}`);
        console.log(`   📝 Ingredients: ${recipe.ingredients.length}`);
        console.log(`   📋 Instructions: ${recipe.instructions.length}`);
        console.log('');
      });
    } else {
      console.error('❌ Pipeline test failed:', data.error);
      console.error('Details:', data.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPipeline();