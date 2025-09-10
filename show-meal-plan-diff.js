#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function showMealPlanDiff() {
  const planPath = 'data/plan.json';
  
  if (!fs.existsSync(planPath)) {
    console.log('❌ No meal plan found at', planPath);
    return;
  }

  try {
    const currentPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    
    console.log('🍽️ Current Meal Plan Summary:');
    console.log('================================');
    console.log(`📊 Total Recipes: ${currentPlan.recipes?.length || 0}`);
    console.log(`💰 Total Cost: $${currentPlan.totalCost || 0}`);
    console.log(`🎯 Confidence: ${currentPlan.confidence || 'unknown'}`);
    console.log('');
    
    if (currentPlan.recipes && currentPlan.recipes.length > 0) {
      console.log('📋 Recipe Details:');
      currentPlan.recipes.forEach((recipe, index) => {
        console.log(`${index + 1}. ${recipe.title}`);
        console.log(`   🌍 Cuisine: ${recipe.cuisine}`);
        console.log(`   ⏱️  Time: ${recipe.totalTimeMinutes} minutes`);
        console.log(`   💵 Cost: $${recipe.estimatedCost} ($${recipe.costPerServing}/serving)`);
        console.log(`   🍽️  Servings: ${recipe.servings}`);
        console.log('');
      });
    }
    
    console.log('✅ Meal plan generated successfully!');
    
  } catch (error) {
    console.error('❌ Error reading meal plan:', error.message);
  }
}

showMealPlanDiff();