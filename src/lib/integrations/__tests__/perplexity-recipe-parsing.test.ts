/**
 * Comprehensive tests for Perplexity recipe parsing integration
 * 
 * Tests all aspects of the Perplexity API integration including:
 * - Recipe parsing with structured prompts
 * - Response validation and error handling
 * - Retry logic and fallback mechanisms
 * - Cultural context extraction
 * - Image extraction and validation
 */

import { PerplexityClient } from '../perplexity-client';
import { PerplexityRecipeService } from '../perplexity-recipe-service';
import { PerplexityRecipePrompts } from '../perplexity-recipe-prompts';
import { PerplexityPromptValidator } from '../perplexity-prompt-validator';

// Mock environment variables
process.env.PERPLEXITY_API_KEY = 'test-api-key';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Perplexity Recipe Parsing Integration', () => {
  let client: PerplexityClient;
  let service: PerplexityRecipeService;

  beforeEach(() => {
    client = new PerplexityClient();
    service = new PerplexityRecipeService();
    jest.clearAllMocks();
  });

  describe('PerplexityRecipePrompts', () => {
    it('should build comprehensive recipe extraction prompt', () => {
      const url = 'https://example.com/recipe';
      const context = {
        culturalCuisine: 'italian',
        dietaryRestrictions: ['vegetarian'],
        maintainAuthenticity: true
      };

      const prompt = PerplexityRecipePrompts.buildRecipeExtractionPrompt(url, context);

      expect(prompt.systemPrompt).toContain('professional culinary expert');
      expect(prompt.systemPrompt).toContain('cultural food historian');
      expect(prompt.userPrompt).toContain(url);
      expect(prompt.userPrompt).toContain('italian cuisine');
      expect(prompt.userPrompt).toContain('vegetarian');
      expect(prompt.expectedFormat).toContain('JSON object');
      expect(prompt.validationRules).toHaveLength(9);
    });

    it('should build image extraction prompt', () => {
      const url = 'https://example.com/recipe';
      const title = 'Pasta Carbonara';

      const prompt = PerplexityRecipePrompts.buildImageExtractionPrompt(url, title);

      expect(prompt.systemPrompt).toContain('visual content expert');
      expect(prompt.userPrompt).toContain(url);
      expect(prompt.userPrompt).toContain(title);
      expect(prompt.qualityCriteria).toContain('high-resolution');
    });

    it('should build recipe modification prompt', () => {
      const originalRecipe = {
        title: 'Chicken Parmesan',
        ingredients: [{ name: 'chicken breast', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken' }],
        metadata: { servings: 4, totalTimeMinutes: 30 }
      };

      const prompt = PerplexityRecipePrompts.buildRecipeModificationPrompt(
        originalRecipe,
        'vegetarian',
        true
      );

      expect(prompt.systemPrompt).toContain('dietary adaptations');
      expect(prompt.userPrompt).toContain('vegetarian');
      expect(prompt.userPrompt).toContain('cultural authenticity');
      expect(prompt.validationRules).toContain('culturally appropriate');
    });
  });

  describe('PerplexityPromptValidator', () => {
    it('should validate complete recipe response', () => {
      const validRecipe = {
        title: 'Test Recipe',
        description: 'A test recipe',
        culturalContext: 'Traditional Italian dish with rich history',
        ingredients: [
          { name: 'pasta', amount: 1, unit: 'lb', culturalSignificance: 'essential' },
          { name: 'tomatoes', amount: 2, unit: 'cups', culturalSignificance: 'important' }
        ],
        instructions: [
          { step: 1, text: 'Boil water in a large pot', timeMinutes: 5 },
          { step: 2, text: 'Add pasta and cook until al dente', timeMinutes: 10 }
        ],
        metadata: {
          servings: 4,
          totalTimeMinutes: 30,
          difficulty: 'easy',
          culturalAuthenticity: 'traditional'
        },
        images: [
          { url: 'https://example.com/image.jpg', quality: 'high', relevance: 'primary_dish' }
        ],
        dietaryInfo: {
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false
        }
      };

      const validation = PerplexityPromptValidator.validateRecipeExtraction(validRecipe);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.completeness.hasTitle).toBe(true);
      expect(validation.completeness.hasIngredients).toBe(true);
      expect(validation.completeness.hasInstructions).toBe(true);
      expect(validation.quality.ingredientCount).toBe(2);
      expect(validation.quality.instructionCount).toBe(2);
    });

    it('should identify missing required fields', () => {
      const incompleteRecipe = {
        title: 'Test Recipe'
        // Missing ingredients and instructions
      };

      const validation = PerplexityPromptValidator.validateRecipeExtraction(incompleteRecipe);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Ingredients must be an array');
      expect(validation.errors).toContain('Instructions must be an array');
      expect(validation.score).toBeLessThan(50);
    });

    it('should validate JSON structure', () => {
      const validJson = '{"title": "Test Recipe", "ingredients": []}';
      const invalidJson = '{"title": "Test Recipe", "ingredients": [';

      const validResult = PerplexityPromptValidator.validateJSONStructure(validJson);
      const invalidResult = PerplexityPromptValidator.validateJSONStructure(invalidJson);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain('JSON parsing failed');
    });
  });

  describe('PerplexityClient', () => {
    it('should handle API errors with retry logic', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server error')
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  title: 'Test Recipe',
                  ingredients: [{ name: 'test', amount: 1, unit: 'cup' }],
                  instructions: [{ step: 1, text: 'Test instruction' }],
                  metadata: { servings: 4, totalTimeMinutes: 30 }
                })
              }
            }],
            usage: { total_tokens: 100 }
          })
        } as Response);

      const result = await client.parseRecipeFromUrl('https://example.com/recipe');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.title).toBe('Test Recipe');
    });

    it('should validate and sanitize parsed responses', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: '  Test Recipe  ', // Extra whitespace
                ingredients: [
                  { name: 'test ingredient', amount: '1.5', unit: 'cups' }, // String amount
                  { name: '', amount: 0, unit: 'invalid' } // Invalid ingredient
                ],
                instructions: [
                  { step: '1', text: 'Test instruction with proper content' }, // String step
                  { step: 2, text: 'Short' } // Very short instruction
                ],
                metadata: {
                  servings: '4', // String servings
                  totalTimeMinutes: 'invalid', // Invalid time
                  difficulty: 'EASY' // Wrong case
                }
              })
            }
          }],
          usage: { total_tokens: 100 }
        })
      } as Response);

      const result = await client.parseRecipeFromUrl('https://example.com/recipe');

      expect(result.title).toBe('Test Recipe'); // Trimmed
      expect(result.ingredients[0].amount).toBe(1.5); // Parsed to number
      expect(result.instructions[0].step).toBe(1); // Parsed to number
      expect(result.metadata.servings).toBe(4); // Parsed to number
      expect(result.metadata.totalTimeMinutes).toBe(30); // Fallback value
      expect(result.metadata.difficulty).toBe('easy'); // Normalized
    });

    it('should handle malformed JSON responses', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'This is not valid JSON: {"title": "Test", invalid}'
            }
          }],
          usage: { total_tokens: 100 }
        })
      } as Response);

      await expect(client.parseRecipeFromUrl('https://example.com/recipe'))
        .rejects.toThrow('Failed to parse recipe');
    });
  });

  describe('PerplexityRecipeService', () => {
    it('should parse recipe with validation and retry', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Italian Pasta Recipe',
                description: 'Traditional Italian pasta dish',
                culturalContext: 'This dish originates from Northern Italy and represents traditional cooking methods',
                ingredients: [
                  { name: 'pasta', amount: 1, unit: 'lb', culturalSignificance: 'essential' },
                  { name: 'tomatoes', amount: 2, unit: 'cups', culturalSignificance: 'important' },
                  { name: 'basil', amount: 0.25, unit: 'cup', culturalSignificance: 'important' }
                ],
                instructions: [
                  { step: 1, text: 'Bring a large pot of salted water to boil', timeMinutes: 5 },
                  { step: 2, text: 'Add pasta and cook according to package directions until al dente', timeMinutes: 10 },
                  { step: 3, text: 'Meanwhile, heat olive oil in a large skillet over medium heat', timeMinutes: 2 }
                ],
                metadata: {
                  servings: 4,
                  totalTimeMinutes: 30,
                  difficulty: 'easy',
                  culturalAuthenticity: 'traditional'
                },
                images: ['https://example.com/pasta.jpg']
              })
            }
          }],
          usage: { total_tokens: 150 }
        })
      } as Response);

      const result = await service.parseRecipeFromUrl('https://example.com/recipe', {
        culturalCuisine: 'italian'
      }, {
        validateResponse: true,
        includeImages: true
      });

      expect(result.recipe.title).toBe('Italian Pasta Recipe');
      expect(result.recipe.ingredients).toHaveLength(3);
      expect(result.recipe.instructions).toHaveLength(3);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.score).toBeGreaterThan(80);
      expect(result.metadata.source).toBe('perplexity');
    });

    it('should handle recipe modification', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock original recipe parsing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Chicken Parmesan',
                ingredients: [
                  { name: 'chicken breast', amount: 1, unit: 'lb' },
                  { name: 'parmesan cheese', amount: 0.5, unit: 'cup' }
                ],
                instructions: [
                  { step: 1, text: 'Pound chicken to even thickness' },
                  { step: 2, text: 'Bread and fry chicken until golden' }
                ],
                metadata: { servings: 4, totalTimeMinutes: 45 }
              })
            }
          }]
        })
      } as Response);

      // Mock modification response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                modifiedRecipe: {
                  title: 'Eggplant Parmesan',
                  ingredients: [
                    { name: 'eggplant', amount: 1, unit: 'large' },
                    { name: 'parmesan cheese', amount: 0.5, unit: 'cup' }
                  ],
                  instructions: [
                    { step: 1, text: 'Slice eggplant into rounds' },
                    { step: 2, text: 'Bread and bake eggplant until golden' }
                  ],
                  metadata: { servings: 4, totalTimeMinutes: 50 }
                },
                modifications: [
                  {
                    originalIngredient: 'chicken breast',
                    substituteIngredient: 'eggplant',
                    reason: 'Traditional Italian vegetarian alternative',
                    culturalAuthenticity: 'traditional'
                  }
                ],
                authenticityNotes: 'Eggplant Parmesan is a traditional Italian vegetarian dish'
              })
            }
          }]
        })
      } as Response);

      const originalResult = await service.parseRecipeFromUrl('https://example.com/recipe');
      const modificationResult = await service.modifyRecipe({
        originalRecipe: originalResult.recipe as any,
        modificationType: 'vegetarian',
        maintainAuthenticity: true
      });

      expect(modificationResult.modifiedRecipe.title).toBe('Eggplant Parmesan');
      expect(modificationResult.modifications).toHaveLength(1);
      expect(modificationResult.modifications[0].originalIngredient).toBe('chicken breast');
      expect(modificationResult.modifications[0].substituteIngredient).toBe('eggplant');
      expect(modificationResult.authenticityNotes).toContain('traditional Italian');
    });

    it('should extract and validate images', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify([
                {
                  url: 'https://example.com/pasta-dish.jpg',
                  description: 'Finished pasta dish with garnish',
                  quality: 'high',
                  relevance: 'primary_dish',
                  priority: 10
                },
                {
                  url: 'https://example.com/cooking-process.jpg',
                  description: 'Pasta being cooked in pot',
                  quality: 'medium',
                  relevance: 'cooking_process',
                  priority: 7
                }
              ])
            }
          }]
        })
      } as Response);

      const result = await service.extractHighQualityImages('https://example.com/recipe', 'Pasta Recipe');

      expect(result.images).toHaveLength(2);
      expect(result.images[0].relevance).toBe('primary_dish');
      expect(result.images[0].quality).toBe('high');
      expect(result.highQualityCount).toBe(1);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      await expect(client.parseRecipeFromUrl('https://example.com/recipe'))
        .rejects.toThrow('Recipe parsing failed');
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock rate limit responses followed by success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('Rate limited')
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('Rate limited')
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  title: 'Test Recipe',
                  ingredients: [{ name: 'test', amount: 1, unit: 'cup' }],
                  instructions: [{ step: 1, text: 'Test instruction' }],
                  metadata: { servings: 4, totalTimeMinutes: 30 }
                })
              }
            }]
          })
        } as Response);

      const result = await client.parseRecipeFromUrl('https://example.com/recipe');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.title).toBe('Test Recipe');
    });

    it('should provide meaningful error messages', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key')
      } as Response);

      await expect(client.parseRecipeFromUrl('https://example.com/recipe'))
        .rejects.toThrow('Perplexity API error: 401 Unauthorized - Invalid API key');
    });
  });
});