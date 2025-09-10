/**
 * Test API endpoint for Perplexity recipe parsing
 * 
 * Tests the complete Perplexity recipe parsing workflow with real URLs
 * as specified in task 3.2 terminal test requirements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { perplexityRecipeService } from '@/lib/integrations/perplexity-recipe-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      url = 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/',
      culturalCuisine = 'american',
      dietaryRestrictions = [],
      testType = 'basic'
    } = body;

    console.log(`🧪 Testing Perplexity recipe parsing: ${testType}`);
    console.log(`📍 URL: ${url}`);
    console.log(`🌍 Cultural cuisine: ${culturalCuisine}`);
    console.log(`🥗 Dietary restrictions: ${dietaryRestrictions.join(', ') || 'none'}`);

    const startTime = Date.now();

    switch (testType) {
      case 'basic':
        return await testBasicParsing(url, culturalCuisine, dietaryRestrictions);
      
      case 'validation':
        return await testWithValidation(url, culturalCuisine, dietaryRestrictions);
      
      case 'modification':
        return await testRecipeModification(url, culturalCuisine, dietaryRestrictions);
      
      case 'images':
        return await testImageExtraction(url);
      
      case 'cultural':
        return await testCulturalAuthenticity(url, culturalCuisine);
      
      case 'batch':
        return await testBatchParsing([
          'https://www.allrecipes.com/recipe/16354/easy-meatloaf/',
          'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/',
          'https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524'
        ], culturalCuisine);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Use: basic, validation, modification, images, cultural, batch'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Perplexity recipe parsing test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test basic recipe parsing functionality
 */
async function testBasicParsing(url: string, culturalCuisine: string, dietaryRestrictions: string[]) {
  const startTime = Date.now();
  
  try {
    const result = await perplexityRecipeService.parseRecipeFromUrl(url, {
      culturalCuisine,
      dietaryRestrictions
    });

    const parseTime = Date.now() - startTime;

    // Validate basic requirements
    const recipe = result.recipe;
    const hasTitle = !!recipe.title;
    const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
    const hasInstructions = recipe.instructions && recipe.instructions.length > 0;
    const hasImages = recipe.images && recipe.images.length > 0;

    console.log('✅ Basic parsing test results:');
    console.log(`   Recipe Title: ${recipe.title}`);
    console.log(`   Ingredients: ${recipe.ingredients?.length || 0}`);
    console.log(`   Instructions: ${recipe.instructions?.length || 0}`);
    console.log(`   Images: ${recipe.images?.length || 0}`);
    console.log(`   Parse time: ${parseTime}ms`);
    console.log(`   Quality score: ${result.validation.score}`);

    return NextResponse.json({
      success: true,
      testType: 'basic',
      results: {
        recipe: {
          title: recipe.title,
          description: recipe.description,
          culturalContext: recipe.culturalContext,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          metadata: recipe.metadata,
          images: recipe.images,
          ingredientCount: recipe.ingredients?.length || 0,
          instructionCount: recipe.instructions?.length || 0,
          imageCount: recipe.images?.length || 0,
          totalTimeMinutes: recipe.metadata.totalTimeMinutes,
          servings: recipe.metadata.servings,
          difficulty: recipe.metadata.difficulty
        },
        validation: {
          isValid: result.validation.isValid,
          score: result.validation.score,
          errors: result.validation.errors,
          warnings: result.validation.warnings
        },
        performance: {
          parseTime,
          retryCount: result.metadata.retryCount,
          qualityScore: result.metadata.qualityScore
        },
        checks: {
          hasTitle,
          hasIngredients,
          hasInstructions,
          hasImages,
          meetsRequirements: hasTitle && hasIngredients && hasInstructions
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      testType: 'basic',
      error: error.message,
      parseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test parsing with comprehensive validation
 */
async function testWithValidation(url: string, culturalCuisine: string, dietaryRestrictions: string[]) {
  const startTime = Date.now();
  
  try {
    const result = await perplexityRecipeService.parseRecipeFromUrl(url, {
      culturalCuisine,
      dietaryRestrictions
    }, {
      validateResponse: true,
      retryOnValidationFailure: true,
      maxRetries: 2,
      includeImages: true,
      culturalAuthenticity: 'moderate'
    });

    const parseTime = Date.now() - startTime;

    console.log('✅ Validation test results:');
    console.log(`   Validation passed: ${result.validation.isValid}`);
    console.log(`   Quality score: ${result.validation.score}/100`);
    console.log(`   Errors: ${result.validation.errors.length}`);
    console.log(`   Warnings: ${result.validation.warnings.length}`);
    console.log(`   Cultural depth: ${result.validation.quality.culturalDepth}/10`);
    console.log(`   Authenticity score: ${result.validation.quality.authenticityScore}/10`);

    return NextResponse.json({
      success: true,
      testType: 'validation',
      results: {
        validation: result.validation,
        performance: {
          parseTime,
          retryCount: result.metadata.retryCount
        },
        recipe: {
          title: result.recipe.title,
          culturalContext: result.recipe.culturalContext,
          ingredientCount: result.recipe.ingredients?.length || 0,
          instructionCount: result.recipe.instructions?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      testType: 'validation',
      error: error.message,
      parseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test recipe modification functionality
 */
async function testRecipeModification(url: string, culturalCuisine: string, dietaryRestrictions: string[]) {
  const startTime = Date.now();
  
  try {
    // First parse the original recipe
    const originalResult = await perplexityRecipeService.parseRecipeFromUrl(url, {
      culturalCuisine,
      dietaryRestrictions: []
    });

    // Then modify it for vegetarian diet
    const modificationResult = await perplexityRecipeService.modifyRecipe({
      originalRecipe: originalResult.recipe as any,
      modificationType: 'vegetarian',
      maintainAuthenticity: true
    });

    const totalTime = Date.now() - startTime;

    console.log('✅ Modification test results:');
    console.log(`   Original: ${originalResult.recipe.title}`);
    console.log(`   Modified: ${modificationResult.modifiedRecipe.title}`);
    console.log(`   Modifications: ${modificationResult.modifications.length}`);
    console.log(`   Authenticity notes: ${modificationResult.authenticityNotes}`);

    return NextResponse.json({
      success: true,
      testType: 'modification',
      results: {
        original: {
          title: originalResult.recipe.title,
          ingredientCount: originalResult.recipe.ingredients?.length || 0
        },
        modified: {
          title: modificationResult.modifiedRecipe.title,
          ingredientCount: modificationResult.modifiedRecipe.ingredients?.length || 0,
          modifications: modificationResult.modifications.map(mod => ({
            from: mod.originalIngredient,
            to: mod.substituteIngredient,
            reason: mod.reason,
            authenticity: mod.culturalAuthenticity
          })),
          authenticityNotes: modificationResult.authenticityNotes
        },
        performance: {
          totalTime,
          originalParseTime: originalResult.metadata.parseTime,
          modificationTime: totalTime - originalResult.metadata.parseTime
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      testType: 'modification',
      error: error.message,
      totalTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test image extraction functionality
 */
async function testImageExtraction(url: string) {
  const startTime = Date.now();
  
  try {
    const imageResult = await perplexityRecipeService.extractHighQualityImages(url);
    const extractTime = Date.now() - startTime;

    console.log('✅ Image extraction test results:');
    console.log(`   Total images found: ${imageResult.totalFound}`);
    console.log(`   High quality images: ${imageResult.highQualityCount}`);
    console.log(`   Images returned: ${imageResult.images.length}`);

    return NextResponse.json({
      success: true,
      testType: 'images',
      results: {
        totalFound: imageResult.totalFound,
        highQualityCount: imageResult.highQualityCount,
        imagesReturned: imageResult.images.length,
        images: imageResult.images.map(img => ({
          url: img.url,
          quality: img.quality,
          relevance: img.relevance,
          priority: img.priority
        })),
        performance: {
          extractTime
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      testType: 'images',
      error: error.message,
      extractTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test cultural authenticity assessment
 */
async function testCulturalAuthenticity(url: string, culturalCuisine: string) {
  const startTime = Date.now();
  
  try {
    // First parse the recipe
    const parseResult = await perplexityRecipeService.parseRecipeFromUrl(url, {
      culturalCuisine
    });

    // Then assess authenticity
    const authenticityResult = await perplexityRecipeService.assessCulturalAuthenticity(
      parseResult.recipe,
      culturalCuisine
    );

    const totalTime = Date.now() - startTime;

    console.log('✅ Cultural authenticity test results:');
    console.log(`   Authenticity score: ${authenticityResult.authenticityScore}/10`);
    console.log(`   Authenticity level: ${authenticityResult.authenticityLevel}`);
    console.log(`   Historical context: ${authenticityResult.historicalContext.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      testType: 'cultural',
      results: {
        recipe: {
          title: parseResult.recipe.title,
          culturalContext: parseResult.recipe.culturalContext
        },
        authenticity: {
          score: authenticityResult.authenticityScore,
          level: authenticityResult.authenticityLevel,
          culturalAccuracy: authenticityResult.culturalAccuracy,
          historicalContext: authenticityResult.historicalContext,
          improvementSuggestions: authenticityResult.improvementSuggestions
        },
        performance: {
          totalTime
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      testType: 'cultural',
      error: error.message,
      totalTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test batch parsing of multiple URLs
 */
async function testBatchParsing(urls: string[], culturalCuisine: string) {
  const startTime = Date.now();
  
  try {
    const results = await Promise.allSettled(
      urls.map(url => 
        perplexityRecipeService.parseRecipeFromUrl(url, { culturalCuisine })
      )
    );

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log('✅ Batch parsing test results:');
    console.log(`   Total URLs: ${urls.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average time per recipe: ${Math.round(totalTime / urls.length)}ms`);

    return NextResponse.json({
      success: true,
      testType: 'batch',
      results: {
        totalUrls: urls.length,
        successful,
        failed,
        recipes: results.map((result, index) => ({
          url: urls[index],
          success: result.status === 'fulfilled',
          title: result.status === 'fulfilled' ? result.value.recipe.title : null,
          error: result.status === 'rejected' ? result.reason.message : null
        })),
        performance: {
          totalTime,
          averageTimePerRecipe: Math.round(totalTime / urls.length)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      testType: 'batch',
      error: error.message,
      totalTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Perplexity Recipe Parsing Test API',
    usage: 'POST with { url, culturalCuisine, dietaryRestrictions, testType }',
    testTypes: [
      'basic - Basic recipe parsing test',
      'validation - Test with comprehensive validation',
      'modification - Test recipe modification for dietary restrictions',
      'images - Test image extraction',
      'cultural - Test cultural authenticity assessment',
      'batch - Test batch parsing of multiple URLs'
    ],
    example: {
      url: 'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/',
      culturalCuisine: 'american',
      dietaryRestrictions: [],
      testType: 'basic'
    }
  });
}