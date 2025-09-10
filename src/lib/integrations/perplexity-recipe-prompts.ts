/**
 * Perplexity Recipe Extraction Prompts
 * 
 * Specialized prompts for extracting structured recipe data with cultural context
 * and authenticity information. Designed for the Tavily + Perplexity two-stage
 * recipe search system.
 */

import { RecipeIngredient, RecipeInstruction, DietaryInfo } from './recipe-types';

export interface ParsingContext {
  culturalCuisine?: string;
  dietaryRestrictions?: string[];
  expectedLanguage?: string;
  maintainAuthenticity?: boolean;
}

export interface RecipeExtractionPrompt {
  systemPrompt: string;
  userPrompt: string;
  expectedFormat: string;
  validationRules: string[];
}

export interface ImageExtractionPrompt {
  systemPrompt: string;
  userPrompt: string;
  qualityCriteria: string[];
}

export class PerplexityRecipePrompts {
  
  /**
   * Build comprehensive recipe extraction prompt with cultural context
   */
  static buildRecipeExtractionPrompt(url: string, context: ParsingContext = {}): RecipeExtractionPrompt {
    const culturalContext = context.culturalCuisine 
      ? `This recipe is from ${context.culturalCuisine} cuisine. Please preserve cultural authenticity, traditional cooking methods, and include cultural significance.`
      : 'Please identify the cultural origin and include relevant cultural context.';

    const dietaryContext = context.dietaryRestrictions && context.dietaryRestrictions.length > 0
      ? `Consider these dietary restrictions when analyzing: ${context.dietaryRestrictions.join(', ')}. Note any ingredients that conflict with these restrictions.`
      : '';

    const authenticityNote = context.maintainAuthenticity !== false
      ? 'Prioritize traditional ingredient names, authentic cooking techniques, and cultural significance.'
      : 'Focus on practical extraction with clear, accessible ingredient names.';

    const systemPrompt = `You are a professional culinary expert and cultural food historian specializing in recipe analysis and extraction. Your expertise includes:

1. **Cultural Authenticity**: Deep knowledge of traditional cooking methods, ingredient significance, and cultural food practices
2. **Recipe Structure**: Understanding of proper ingredient measurements, cooking techniques, and instruction sequencing
3. **Nutritional Analysis**: Ability to estimate nutritional content and identify dietary compatibility
4. **Image Recognition**: Skill in identifying high-quality, relevant recipe images
5. **Language Precision**: Expertise in culinary terminology across cultures

Your task is to extract complete, accurate recipe data while preserving cultural authenticity and providing educational context about the dish's significance.

CRITICAL REQUIREMENTS:
- Extract ALL ingredients with precise measurements and units
- Provide step-by-step instructions in logical cooking order
- Include cultural context and traditional significance
- Identify and validate high-quality recipe images
- Estimate cooking times and difficulty levels accurately
- Preserve authentic ingredient names and techniques
- Return ONLY valid JSON without additional text or markdown`;

    const userPrompt = `Please analyze the recipe at this URL and extract complete information: ${url}

${culturalContext}
${dietaryContext}
${authenticityNote}

Extract the following information and return it as a JSON object:

{
  "title": "Complete recipe title",
  "description": "Brief but informative description of the dish",
  "culturalContext": "Cultural background, traditional significance, regional variations, and authenticity notes",
  "culturalOrigin": ["primary culture", "secondary influences"],
  "cuisine": "primary cuisine type",
  "ingredients": [
    {
      "name": "ingredient name (use traditional names when authentic)",
      "amount": numeric_amount,
      "unit": "measurement unit (standardized)",
      "notes": "preparation notes, cultural significance, or substitution guidance",
      "substitutions": ["culturally appropriate alternatives"],
      "culturalSignificance": "essential|important|common|optional"
    }
  ],
  "instructions": [
    {
      "step": step_number,
      "text": "detailed instruction with cultural techniques explained",
      "timeMinutes": estimated_time_for_step,
      "temperature": "cooking temperature with unit",
      "equipment": ["required equipment"],
      "culturalTechnique": "traditional method or cultural significance of this step"
    }
  ],
  "metadata": {
    "servings": number_of_servings,
    "yieldText": "descriptive yield (e.g., 'Serves 4-6 people')",
    "prepTimeMinutes": preparation_time,
    "cookTimeMinutes": cooking_time,
    "totalTimeMinutes": total_time,
    "difficulty": "easy|medium|hard",
    "culturalAuthenticity": "traditional|adapted|modern"
  },
  "images": [
    {
      "url": "high-quality image URL",
      "description": "what the image shows",
      "quality": "high|medium|low",
      "relevance": "primary_dish|ingredient|cooking_process|cultural_context"
    }
  ],
  "dietaryInfo": {
    "isVegetarian": boolean,
    "isVegan": boolean,
    "isGlutenFree": boolean,
    "isDairyFree": boolean,
    "isNutFree": boolean,
    "isHalal": boolean_or_null,
    "isKosher": boolean_or_null,
    "customRestrictions": ["any other dietary notes"]
  },
  "nutritionalInfo": {
    "calories": estimated_calories_per_serving,
    "protein_g": estimated_protein,
    "fat_g": estimated_fat,
    "carbs_g": estimated_carbs
  },
  "tags": ["cuisine_type", "meal_type", "cooking_method", "cultural_tags"],
  "traditionalOccasions": ["when this dish is traditionally served"],
  "regionalVariations": ["notable regional differences if any"]
}`;

    const expectedFormat = `JSON object with complete recipe data including cultural context, dietary information, and high-quality images`;

    const validationRules = [
      'Must include at least 3 ingredients with proper measurements',
      'Must include at least 3 cooking instructions in logical order',
      'Cultural context must be informative and respectful',
      'Images must be validated for quality and relevance',
      'Cooking times must be realistic and helpful',
      'Dietary information must be accurate based on ingredients',
      'Traditional names should be preserved when culturally significant',
      'All numeric values must be properly formatted',
      'JSON must be valid and parseable'
    ];

    return {
      systemPrompt,
      userPrompt,
      expectedFormat,
      validationRules
    };
  }

  /**
   * Build specialized image extraction prompt for high-quality recipe photos
   */
  static buildImageExtractionPrompt(url: string, recipeTitle?: string): ImageExtractionPrompt {
    const titleContext = recipeTitle 
      ? `The recipe is titled "${recipeTitle}". Focus on images that show this specific dish.`
      : 'Focus on images that show the completed dish or key cooking steps.';

    const systemPrompt = `You are a visual content expert specializing in food photography and recipe imagery. Your expertise includes:

1. **Image Quality Assessment**: Identifying high-resolution, well-lit, professionally composed food images
2. **Relevance Evaluation**: Distinguishing between primary dish photos, ingredient shots, and cooking process images
3. **Cultural Authenticity**: Recognizing traditional presentation styles and cultural food photography
4. **Technical Standards**: Understanding web image formats, accessibility, and loading performance

Your task is to identify and validate the highest quality, most relevant images for recipe content.`;

    const userPrompt = `Please analyze the recipe page at this URL and extract high-quality images: ${url}

${titleContext}

Find and validate images according to these priorities:

1. **Primary Dish Images**: Photos showing the completed recipe as it should look when finished
2. **Cooking Process**: Step-by-step photos showing key cooking techniques or stages
3. **Ingredient Photos**: High-quality images of key or unique ingredients
4. **Cultural Context**: Images showing traditional serving methods or cultural presentation

Return a JSON array of image objects:

[
  {
    "url": "complete image URL (must be accessible)",
    "description": "what the image shows",
    "quality": "high|medium|low",
    "relevance": "primary_dish|cooking_process|ingredients|cultural_context",
    "width": estimated_width_pixels,
    "height": estimated_height_pixels,
    "format": "jpg|png|webp",
    "accessibility": {
      "hasAltText": boolean,
      "altText": "existing alt text if available",
      "suggestedAltText": "suggested descriptive alt text"
    },
    "culturalAuthenticity": "traditional|modern|adapted",
    "priority": 1-10_ranking_for_importance
  }
]`;

    const qualityCriteria = [
      'Images must be high-resolution (minimum 400x300 pixels)',
      'URLs must be accessible and return valid image content',
      'Primary dish photos take highest priority',
      'Images should show the dish as described in the recipe',
      'Avoid generic stock photos or unrelated food images',
      'Prefer images with good lighting and clear detail',
      'Include cultural context when available',
      'Validate that images load successfully',
      'Prioritize images from the recipe source over external images'
    ];

    return {
      systemPrompt,
      userPrompt,
      qualityCriteria
    };
  }

  /**
   * Build recipe modification prompt for dietary adaptations
   */
  static buildRecipeModificationPrompt(
    originalRecipe: any,
    modificationType: string,
    maintainAuthenticity: boolean = true,
    culturalContext?: string
  ): RecipeExtractionPrompt {
    const authenticityGuidance = maintainAuthenticity
      ? `CRITICAL: Maintain cultural authenticity by prioritizing traditional alternatives from ${culturalContext || 'the same culinary tradition'}. Use authentic substitutions that preserve the dish's cultural identity and traditional flavors.`
      : 'Focus on practical, accessible substitutions that work well regardless of cultural authenticity.';

    const culturalNote = culturalContext
      ? `This is a ${culturalContext} dish. Research traditional ${culturalContext} alternatives for ${modificationType} cooking to maintain authenticity.`
      : '';

    const systemPrompt = `You are a professional chef and cultural food expert specializing in dietary adaptations while preserving cultural authenticity. Your expertise includes:

1. **Cultural Culinary Knowledge**: Deep understanding of traditional ingredients and cooking methods across cultures
2. **Dietary Adaptation**: Expert knowledge of ingredient substitutions for various dietary restrictions
3. **Nutritional Balance**: Understanding how substitutions affect nutritional content and cooking properties
4. **Cultural Sensitivity**: Ability to adapt recipes while respecting traditional food practices
5. **Cooking Science**: Knowledge of how ingredient changes affect texture, flavor, and cooking methods

Your task is to modify recipes for dietary restrictions while maintaining cultural authenticity and providing clear explanations for all changes.`;

    const userPrompt = `Please modify this recipe to be ${modificationType} while preserving its cultural authenticity and traditional essence:

${authenticityGuidance}
${culturalNote}

Original Recipe:
${JSON.stringify(originalRecipe, null, 2)}

Provide a complete modified recipe with detailed explanations:

{
  "modifiedRecipe": {
    "title": "modified recipe title (indicate modification if appropriate)",
    "description": "updated description noting the dietary adaptation",
    "culturalContext": "updated cultural context explaining how modifications relate to traditional practices",
    "ingredients": [
      {
        "name": "substitute ingredient name",
        "amount": adjusted_amount,
        "unit": "measurement unit",
        "notes": "preparation notes for substitute ingredient",
        "substitutions": ["additional alternatives"],
        "culturalSignificance": "essential|important|common|optional"
      }
    ],
    "instructions": [
      {
        "step": step_number,
        "text": "modified instruction accounting for substitute ingredients",
        "timeMinutes": adjusted_time_if_needed,
        "temperature": "adjusted temperature if needed",
        "equipment": ["equipment needed"],
        "culturalTechnique": "traditional technique adapted for substitutes"
      }
    ],
    "metadata": {
      "servings": number_of_servings,
      "yieldText": "descriptive yield",
      "prepTimeMinutes": adjusted_prep_time,
      "cookTimeMinutes": adjusted_cook_time,
      "totalTimeMinutes": adjusted_total_time,
      "difficulty": "easy|medium|hard (may change with substitutions)",
      "culturalAuthenticity": "traditional|adapted|modern"
    },
    "dietaryInfo": {
      "isVegetarian": updated_boolean,
      "isVegan": updated_boolean,
      "isGlutenFree": updated_boolean,
      "isDairyFree": updated_boolean,
      "isNutFree": updated_boolean,
      "customRestrictions": ["dietary compliance notes"]
    },
    "tags": ["updated_tags_reflecting_modification"]
  },
  "modifications": [
    {
      "originalIngredient": "original ingredient name",
      "substituteIngredient": "substitute ingredient name",
      "reason": "detailed explanation for the substitution",
      "quantityAdjustment": "how quantities changed and why",
      "cookingAdjustment": "how cooking method/time changed",
      "flavorImpact": "minimal|moderate|significant",
      "culturalAuthenticity": "traditional|adapted|modern",
      "nutritionalImpact": "how nutrition changed",
      "availabilityNotes": "where to find substitute ingredients"
    }
  ],
  "authenticityNotes": "Overall assessment of how modifications affect cultural authenticity, including traditional precedents for these adaptations",
  "culturalContext": "Updated cultural context explaining the modified dish's relationship to traditional cuisine",
  "cookingTips": [
    "practical tips for working with substitute ingredients",
    "how to achieve best results with modifications",
    "cultural techniques that still apply"
  ],
  "nutritionalComparison": {
    "originalCalories": estimated_original_calories,
    "modifiedCalories": estimated_modified_calories,
    "keyNutritionalChanges": ["significant nutritional differences"]
  }
}`;

    const expectedFormat = `JSON object with complete modified recipe, detailed modification explanations, and cultural authenticity assessment`;

    const validationRules = [
      'All substitutions must be appropriate for the specified dietary restriction',
      'Cultural authenticity must be preserved where possible',
      'Cooking instructions must be adjusted for substitute ingredients',
      'Flavor impact must be honestly assessed',
      'Traditional alternatives should be prioritized over generic substitutions',
      'Nutritional changes should be noted',
      'Availability and sourcing of substitutes should be considered',
      'Cultural context should explain the relationship to traditional cuisine'
    ];

    return {
      systemPrompt,
      userPrompt,
      expectedFormat,
      validationRules
    };
  }

  /**
   * Build cultural authenticity assessment prompt
   */
  static buildCulturalAuthenticityPrompt(recipe: any, claimedCuisine: string): RecipeExtractionPrompt {
    const systemPrompt = `You are a cultural food historian and authenticity expert with deep knowledge of traditional cuisines worldwide. Your expertise includes:

1. **Traditional Ingredients**: Knowledge of authentic ingredients used in various cultural cuisines
2. **Cooking Techniques**: Understanding of traditional cooking methods and their cultural significance
3. **Historical Context**: Knowledge of how dishes evolved and spread across cultures
4. **Regional Variations**: Understanding of how recipes vary across different regions within cultures
5. **Cultural Significance**: Knowledge of when and how dishes are traditionally served

Your task is to assess the cultural authenticity of recipes and provide educational context about their traditional origins and significance.`;

    const userPrompt = `Please assess the cultural authenticity of this recipe claimed to be from ${claimedCuisine} cuisine:

Recipe to Analyze:
${JSON.stringify(recipe, null, 2)}

Provide a comprehensive authenticity assessment:

{
  "authenticityScore": 1-10_scale,
  "authenticityLevel": "traditional|adapted|fusion|inauthentic",
  "culturalAccuracy": {
    "ingredients": {
      "authentic": ["list of authentic ingredients"],
      "adapted": ["ingredients that are reasonable adaptations"],
      "inauthentic": ["ingredients that don't belong in traditional versions"]
    },
    "techniques": {
      "traditional": ["traditional cooking methods used"],
      "adapted": ["reasonable adaptations of traditional methods"],
      "modern": ["modern techniques that replace traditional ones"]
    },
    "presentation": {
      "traditional": "how traditionally presented",
      "adaptations": "how this version differs from traditional presentation"
    }
  },
  "historicalContext": "Brief history of this dish and its cultural significance",
  "regionalVariations": ["notable regional differences in preparation"],
  "traditionalOccasions": ["when this dish is traditionally served"],
  "culturalSignificance": "religious|ceremonial|everyday|festive|seasonal",
  "authenticityNotes": [
    "specific notes about authenticity",
    "explanations of adaptations",
    "cultural context for ingredients or techniques"
  ],
  "improvementSuggestions": [
    "how to make the recipe more authentic",
    "traditional ingredients that could replace modern ones",
    "traditional techniques that could be incorporated"
  ],
  "educationalValue": "what this recipe teaches about the culture and cuisine"
}`;

    const expectedFormat = `JSON object with detailed cultural authenticity assessment and educational context`;

    const validationRules = [
      'Authenticity score must be based on traditional ingredients and techniques',
      'Historical context must be accurate and respectful',
      'Regional variations should be noted when relevant',
      'Cultural significance should be explained appropriately',
      'Improvement suggestions should prioritize authenticity',
      'Educational value should promote cultural understanding',
      'Assessment should be respectful of cultural traditions'
    ];

    return {
      systemPrompt,
      userPrompt,
      expectedFormat,
      validationRules
    };
  }

  /**
   * Build ingredient parsing and normalization prompt
   */
  static buildIngredientParsingPrompt(rawIngredients: string[]): RecipeExtractionPrompt {
    const systemPrompt = `You are a culinary measurement expert and ingredient specialist. Your expertise includes:

1. **Measurement Conversion**: Converting between different measurement systems and units
2. **Ingredient Recognition**: Identifying ingredients from various naming conventions and languages
3. **Standardization**: Normalizing ingredient names and measurements for consistency
4. **Cultural Ingredients**: Understanding traditional names and cultural significance of ingredients
5. **Substitution Knowledge**: Understanding ingredient relationships and appropriate substitutions

Your task is to parse, normalize, and standardize ingredient lists while preserving cultural authenticity and providing useful preparation guidance.`;

    const userPrompt = `Please parse and normalize these raw ingredient entries into structured, standardized format:

Raw Ingredients:
${rawIngredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

Convert each ingredient into this standardized format:

{
  "ingredients": [
    {
      "name": "standardized ingredient name (preserve cultural names when significant)",
      "amount": numeric_amount,
      "unit": "standardized_unit (cup, tablespoon, pound, gram, etc.)",
      "originalText": "original ingredient text as written",
      "notes": "preparation notes (chopped, diced, at room temperature, etc.)",
      "substitutions": ["reasonable alternatives"],
      "culturalName": "traditional or cultural name if different from standard name",
      "category": "protein|vegetable|spice|dairy|grain|fat|liquid|other",
      "preparationMethod": "how ingredient should be prepared before use",
      "culturalSignificance": "essential|important|common|optional",
      "seasonalAvailability": "year-round|seasonal|limited",
      "shelfLife": "fresh|pantry|frozen - storage category"
    }
  ],
  "parsingNotes": [
    "any ambiguities or assumptions made during parsing",
    "cultural context for ingredient names",
    "measurement conversion notes"
  ],
  "totalIngredients": number_of_ingredients_parsed,
  "culturalIngredients": ["list of culturally significant ingredients"],
  "commonSubstitutions": [
    {
      "ingredient": "ingredient name",
      "substitutes": ["alternative 1", "alternative 2"],
      "culturalContext": "why these substitutions work in this cultural context"
    }
  ]
}`;

    const expectedFormat = `JSON object with normalized ingredient data and parsing metadata`;

    const validationRules = [
      'All amounts must be converted to numeric values',
      'Units must be standardized (cup, tablespoon, pound, gram, etc.)',
      'Ingredient names should be clear and searchable',
      'Cultural names should be preserved when significant',
      'Preparation notes should be extracted from ingredient text',
      'Substitutions should be culturally appropriate when possible',
      'Categories should help with shopping and meal planning',
      'Parsing notes should explain any ambiguities or assumptions'
    ];

    return {
      systemPrompt,
      userPrompt,
      expectedFormat,
      validationRules
    };
  }

  /**
   * Build instruction parsing and enhancement prompt
   */
  static buildInstructionParsingPrompt(rawInstructions: string[], culturalContext?: string): RecipeExtractionPrompt {
    const culturalNote = culturalContext
      ? `This is a ${culturalContext} recipe. Include traditional cooking techniques and cultural significance of cooking methods where relevant.`
      : 'Include any cultural cooking techniques or traditional methods mentioned.';

    const systemPrompt = `You are a professional chef instructor and culinary technique expert. Your expertise includes:

1. **Cooking Techniques**: Deep knowledge of cooking methods across cultures and cuisines
2. **Instruction Clarity**: Ability to write clear, actionable cooking instructions
3. **Time Management**: Understanding of cooking times and kitchen workflow
4. **Equipment Knowledge**: Familiarity with cooking equipment and tools across cultures
5. **Cultural Techniques**: Knowledge of traditional cooking methods and their significance

Your task is to parse, enhance, and structure cooking instructions while preserving cultural techniques and providing helpful guidance for home cooks.`;

    const userPrompt = `Please parse and enhance these raw cooking instructions into structured, clear steps:

${culturalNote}

Raw Instructions:
${rawInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

Convert into this structured format:

{
  "instructions": [
    {
      "step": step_number,
      "text": "clear, actionable instruction with specific details",
      "timeMinutes": estimated_time_for_this_step,
      "temperature": "cooking temperature with unit (if applicable)",
      "equipment": ["required equipment for this step"],
      "technique": "primary cooking technique used",
      "culturalTechnique": "traditional method or cultural significance",
      "visualCues": ["what to look for to know the step is complete"],
      "tips": ["helpful tips for success with this step"],
      "commonMistakes": ["what to avoid during this step"],
      "preparationNotes": "any prep work needed before starting this step"
    }
  ],
  "cookingFlow": {
    "totalActiveTime": estimated_active_cooking_time,
    "totalPassiveTime": estimated_passive_time,
    "criticalSteps": ["steps that require careful attention"],
    "makeAheadSteps": ["steps that can be done in advance"],
    "simultaneousSteps": ["steps that can be done at the same time"]
  },
  "equipmentSummary": ["all equipment needed for the recipe"],
  "techniqueSummary": ["all cooking techniques used"],
  "culturalTechniques": [
    {
      "technique": "traditional technique name",
      "description": "what the technique involves",
      "culturalSignificance": "why this technique is traditional",
      "modernAlternatives": ["modern equipment or methods that can substitute"]
    }
  ],
  "difficultyAssessment": {
    "overallDifficulty": "easy|medium|hard",
    "skillsRequired": ["specific cooking skills needed"],
    "timeCommitment": "quick|moderate|lengthy",
    "attentionRequired": "low|medium|high"
  }
}`;

    const expectedFormat = `JSON object with structured instructions, cooking flow analysis, and cultural technique information`;

    const validationRules = [
      'Instructions must be in logical cooking order',
      'Each step should be clear and actionable',
      'Time estimates should be realistic for home cooks',
      'Equipment requirements should be clearly specified',
      'Cultural techniques should be explained respectfully',
      'Visual cues help cooks know when steps are complete',
      'Tips should be practical and helpful',
      'Difficulty assessment should be honest and helpful'
    ];

    return {
      systemPrompt,
      userPrompt,
      expectedFormat,
      validationRules
    };
  }
}