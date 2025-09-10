#!/usr/bin/env node

/**
 * Comparison test script: Groq vs Perplexity recipe parsing
 * 
 * Tests both APIs with the same URL and compares:
 * - Speed/Performance
 * - Quality of extracted data
 * - Completeness of results
 * - Cost implications
 */

const testUrl = 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/';

async function runComparisonTest() {
  try {
    console.log('🥊 GROQ vs PERPLEXITY RECIPE PARSING COMPARISON');
    console.log('='.repeat(60));
    console.log(`📍 Test URL: ${testUrl}`);
    console.log(`🌍 Cultural cuisine: american`);
    console.log('');

    // Test Perplexity
    console.log('🧠 Testing Perplexity API...');
    const perplexityStart = Date.now();
    
    const perplexityResponse = await fetch('http://localhost:3000/api/test-perplexity-recipe-parsing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        culturalCuisine: 'american',
        testType: 'basic'
      })
    });

    const perplexityTime = Date.now() - perplexityStart;
    const perplexityResult = await perplexityResponse.json();

    // Test Groq
    console.log('🤖 Testing Groq API...');
    const groqStart = Date.now();
    
    const groqResponse = await fetch('http://localhost:3000/api/test-groq-recipe-parsing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        culturalCuisine: 'american'
      })
    });

    const groqTime = Date.now() - groqStart;
    const groqResult = await groqResponse.json();

    // Display comparison results
    console.log('');
    console.log('📊 COMPARISON RESULTS');
    console.log('='.repeat(60));

    if (perplexityResult.success && groqResult.success) {
      displayComparison(perplexityResult, groqResult, perplexityTime, groqTime);
    } else {
      console.log('❌ One or both tests failed:');
      if (!perplexityResult.success) {
        console.log(`   Perplexity: ${perplexityResult.error}`);
      }
      if (!groqResult.success) {
        console.log(`   Groq: ${groqResult.error}`);
      }
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

function displayComparison(perplexityResult, groqResult, perplexityTime, groqTime) {
  const pRecipe = perplexityResult.results.recipe;
  const gRecipe = groqResult.results.recipe;
  const pPerf = perplexityResult.results.performance;
  const gPerf = groqResult.results.performance;

  // Performance Comparison
  console.log('⚡ PERFORMANCE COMPARISON:');
  console.log('');
  console.log('| Metric              | Perplexity | Groq      | Winner    |');
  console.log('|---------------------|------------|-----------|-----------|');
  console.log(`| Total Time          | ${pPerf.parseTime}ms | ${gPerf.parseTime}ms | ${gPerf.parseTime < pPerf.parseTime ? 'Groq 🏆' : 'Perplexity 🏆'} |`);
  console.log(`| API Response Time   | ${pPerf.parseTime}ms | ${gPerf.extractionTime}ms | ${gPerf.extractionTime < pPerf.parseTime ? 'Groq 🏆' : 'Perplexity 🏆'} |`);
  console.log('');

  // Content Quality Comparison
  console.log('📋 CONTENT QUALITY COMPARISON:');
  console.log('');
  console.log('| Metric              | Perplexity | Groq      | Winner    |');
  console.log('|---------------------|------------|-----------|-----------|');
  console.log(`| Ingredients Count   | ${pRecipe.ingredientCount}         | ${gRecipe.ingredientCount}        | ${gRecipe.ingredientCount > pRecipe.ingredientCount ? 'Groq 🏆' : pRecipe.ingredientCount > gRecipe.ingredientCount ? 'Perplexity 🏆' : 'Tie 🤝'} |`);
  console.log(`| Instructions Count  | ${pRecipe.instructionCount}         | ${gRecipe.instructionCount}        | ${gRecipe.instructionCount > pRecipe.instructionCount ? 'Groq 🏆' : pRecipe.instructionCount > gRecipe.instructionCount ? 'Perplexity 🏆' : 'Tie 🤝'} |`);
  console.log(`| Images Found        | ${pRecipe.imageCount}         | ${gRecipe.imageCount}        | ${gRecipe.imageCount > pRecipe.imageCount ? 'Groq 🏆' : pRecipe.imageCount > gRecipe.imageCount ? 'Perplexity 🏆' : 'Tie 🤝'} |`);
  console.log(`| Total Time (recipe) | ${pRecipe.totalTimeMinutes} min    | ${gRecipe.totalTimeMinutes} min   | ${Math.abs(gRecipe.totalTimeMinutes - 75) < Math.abs(pRecipe.totalTimeMinutes - 75) ? 'Groq 🏆' : 'Perplexity 🏆'} |`);
  console.log(`| Servings            | ${pRecipe.servings}         | ${gRecipe.servings}        | ${Math.abs(gRecipe.servings - 6) < Math.abs(pRecipe.servings - 6) ? 'Groq 🏆' : 'Perplexity 🏆'} |`);
  console.log('');

  // Detailed Recipe Comparison
  console.log('📖 DETAILED RECIPE COMPARISON:');
  console.log('');
  
  console.log('🏷️ TITLES:');
  console.log(`   Perplexity: "${pRecipe.title}"`);
  console.log(`   Groq:       "${gRecipe.title}"`);
  console.log('');

  console.log('📝 CULTURAL CONTEXT LENGTH:');
  console.log(`   Perplexity: ${pRecipe.culturalContext?.length || 0} characters`);
  console.log(`   Groq:       ${gRecipe.culturalContext?.length || 0} characters`);
  console.log('');

  // Show first few ingredients for comparison
  console.log('🥘 FIRST 3 INGREDIENTS COMPARISON:');
  console.log('');
  console.log('Perplexity:');
  pRecipe.ingredients.slice(0, 3).forEach((ing, i) => {
    console.log(`  ${i + 1}. ${ing.amount} ${ing.unit} ${ing.name}`);
  });
  console.log('');
  console.log('Groq:');
  gRecipe.ingredients.slice(0, 3).forEach((ing, i) => {
    console.log(`  ${i + 1}. ${ing.amount} ${ing.unit} ${ing.name}`);
  });
  console.log('');

  // Show first instruction for comparison
  console.log('👨‍🍳 FIRST INSTRUCTION COMPARISON:');
  console.log('');
  console.log('Perplexity:');
  console.log(`  1. ${pRecipe.instructions[0]?.text || 'No instruction'}`);
  console.log('');
  console.log('Groq:');
  console.log(`  1. ${gRecipe.instructions[0]?.text || 'No instruction'}`);
  console.log('');

  // Cost Analysis (estimated)
  console.log('💰 ESTIMATED COST ANALYSIS:');
  console.log('');
  console.log('| Provider   | Model      | Est. Cost* | Speed    | Quality |');
  console.log('|------------|------------|------------|----------|---------|');
  console.log('| Perplexity | sonar      | ~$0.002    | 92s      | High    |');
  console.log('| Groq       | compound   | ~$0.001    | ?s       | ?       |');
  console.log('');
  console.log('*Estimated based on token usage and published pricing');
  console.log('');

  // Overall Winner
  const speedWinner = gPerf.parseTime < pPerf.parseTime ? 'Groq' : 'Perplexity';
  const contentWinner = (gRecipe.ingredientCount + gRecipe.instructionCount) > (pRecipe.ingredientCount + pRecipe.instructionCount) ? 'Groq' : 'Perplexity';
  
  console.log('🏆 OVERALL ASSESSMENT:');
  console.log(`   Speed Winner: ${speedWinner}`);
  console.log(`   Content Winner: ${contentWinner}`);
  console.log(`   Both APIs successfully extracted recipe data! ✅`);
  console.log('');
  console.log('✅ Comparison test completed successfully!');
}

// Run the comparison test
runComparisonTest().catch(console.error);