#!/usr/bin/env node

/**
 * Terminal test script for Perplexity recipe parsing
 * 
 * This script matches the terminal test specified in task 3.2:
 * Tests Perplexity recipe parsing with real URL and validates the results.
 */

const testUrl = 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/';

async function testPerplexityParsing() {
  try {
    console.log('🧪 Testing Perplexity recipe parsing...');
    console.log(`📍 URL: ${testUrl}`);
    console.log('🌍 Cultural cuisine: american');
    console.log('🥗 Dietary restrictions: none');
    console.log('');

    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/test-perplexity-recipe-parsing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl,
        culturalCuisine: 'american',
        dietaryRestrictions: [],
        testType: 'basic'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const recipe = result.results.recipe;
      const validation = result.results.validation;
      const performance = result.results.performance;

      console.log('✅ Perplexity parsing test results:');
      console.log('');
      console.log(`Recipe Title: ${recipe.title}`);
      console.log(`Ingredients: ${recipe.ingredientCount}`);
      console.log(`Instructions: ${recipe.instructionCount}`);
      console.log(`Images: ${recipe.imageCount}`);
      console.log(`Cultural Context: ${recipe.culturalContext ? 'Yes' : 'No'}`);
      console.log(`Total Time: ${recipe.totalTimeMinutes} minutes`);
      console.log(`Servings: ${recipe.servings}`);
      console.log(`Difficulty: ${recipe.difficulty}`);
      console.log('');
      console.log('Validation Results:');
      console.log(`  Valid: ${validation.isValid ? '✅' : '❌'}`);
      console.log(`  Quality Score: ${validation.overallScore || validation.score || 'N/A'}/100`);
      console.log(`  Errors: ${validation.issues ? validation.issues.filter(i => i.type === 'error').length : (validation.errors ? validation.errors.length : 0)}`);
      console.log(`  Warnings: ${validation.issues ? validation.issues.filter(i => i.type === 'warning').length : (validation.warnings ? validation.warnings.length : 0)}`);
      console.log('');
      console.log('Performance:');
      console.log(`  Parse Time: ${performance.parseTime}ms`);
      console.log(`  Retry Count: ${performance.retryCount}`);
      console.log(`  Quality Score: ${performance.qualityScore}`);
      console.log('');
      console.log('Requirements Check:');
      console.log(`  Has Title: ${result.results.checks.hasTitle ? '✅' : '❌'}`);
      console.log(`  Has Ingredients: ${result.results.checks.hasIngredients ? '✅' : '❌'}`);
      console.log(`  Has Instructions: ${result.results.checks.hasInstructions ? '✅' : '❌'}`);
      console.log(`  Has Images: ${result.results.checks.hasImages ? '✅' : '❌'}`);
      console.log(`  Meets Requirements: ${result.results.checks.meetsRequirements ? '✅' : '❌'}`);
      console.log('');

      const errors = validation.issues ? validation.issues.filter(i => i.type === 'error') : (validation.errors || []);
      const warnings = validation.issues ? validation.issues.filter(i => i.type === 'warning') : (validation.warnings || []);

      if (errors.length > 0) {
        console.log('❌ Validation Errors:');
        errors.forEach(error => console.log(`  - ${error.message || error}`));
        console.log('');
      }

      if (warnings.length > 0) {
        console.log('⚠️ Validation Warnings:');
        warnings.forEach(warning => console.log(`  - ${warning.message || warning}`));
        console.log('');
      }

      console.log('📋 FULL RECIPE DETAILS:');
      console.log('='.repeat(60));
      console.log(`Title: ${recipe.title}`);
      console.log(`Description: ${recipe.description || 'No description'}`);
      console.log(`Cultural Context: ${recipe.culturalContext || 'No cultural context'}`);
      console.log('');
      
      console.log('🥘 INGREDIENTS:');
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach((ing, i) => {
          console.log(`  ${i + 1}. ${ing.amount} ${ing.unit} ${ing.name}`);
          if (ing.notes) console.log(`     Notes: ${ing.notes}`);
        });
      } else {
        console.log('  No detailed ingredients available');
      }
      console.log('');
      
      console.log('👨‍🍳 INSTRUCTIONS:');
      if (recipe.instructions && recipe.instructions.length > 0) {
        recipe.instructions.forEach((inst, i) => {
          console.log(`  ${inst.step}. ${inst.text}`);
          if (inst.timeMinutes) console.log(`     Time: ${inst.timeMinutes} minutes`);
          if (inst.temperature) console.log(`     Temperature: ${inst.temperature}`);
          if (inst.equipment && inst.equipment.length > 0) {
            console.log(`     Equipment: ${inst.equipment.join(', ')}`);
          }
        });
      } else {
        console.log('  No detailed instructions available');
      }
      console.log('');
      
      console.log('📊 RECIPE METADATA:');
      if (recipe.metadata) {
        console.log(`  Servings: ${recipe.metadata.servings}`);
        console.log(`  Total Time: ${recipe.metadata.totalTimeMinutes} minutes`);
        console.log(`  Prep Time: ${recipe.metadata.prepTimeMinutes || 'Not specified'} minutes`);
        console.log(`  Cook Time: ${recipe.metadata.cookTimeMinutes || 'Not specified'} minutes`);
        console.log(`  Difficulty: ${recipe.metadata.difficulty}`);
        console.log(`  Cultural Authenticity: ${recipe.metadata.culturalAuthenticity || 'Not specified'}`);
      }
      console.log('');
      
      if (recipe.images && recipe.images.length > 0) {
        console.log('🖼️ IMAGES:');
        recipe.images.forEach((img, i) => {
          console.log(`  ${i + 1}. ${img}`);
        });
        console.log('');
      }
      
      console.log('✅ Perplexity parsing working');

    } else {
      console.error('❌ Test failed:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    console.log('');
    console.log('Make sure the development server is running:');
    console.log('  npm run dev');
    console.log('');
    process.exit(1);
  }
}

// Run the test
testPerplexityParsing().catch(console.error);