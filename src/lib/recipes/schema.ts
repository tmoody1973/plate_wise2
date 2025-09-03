// Zod schemas and JSON Schema for recipe search results
// Provides runtime validation and strong TS types for parsed recipes

import { z } from 'zod'

// Ingredient schema
export const Ingredient = z.object({
  item: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

// Instruction schema
export const Instruction = z.object({
  step: z.number().int().min(1),
  text: z.string().min(1),
})

// Nutrition schema
export const Nutrition = z.object({
  calories: z.number().int().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
})

// Recipe schema
export const Recipe = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  cuisine: z.string().optional(),
  source: z.string().url(),
  image: z.string().url().optional(),
  servings: z.number().int().min(1).optional(),
  total_time_minutes: z.number().int().min(0).optional(),
  // Normalized difficulty label for quick filtering in UI
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  ingredients: z.array(Ingredient).min(1),
  instructions: z.array(Instruction).min(1),
  nutrition: Nutrition.optional(),
})

export const RecipesResponse = z.object({
  recipes: z.array(Recipe).min(0).max(10),
  meta: z.object({
    has_more: z.boolean(),
    sources: z.array(
      z.object({
        url: z.string().url(),
        title: z.string().optional(),
      })
    ),
    used_filters: z.object({
      query: z.string().optional(),
      country: z.string().optional(),
      includeIngredients: z.array(z.string()).optional(),
      excludeIngredients: z.array(z.string()).optional(),
      maxResults: z.number().int().min(1).max(10).optional(),
      excludeSources: z.array(z.string().url()).optional(),
    }),
  }),
})

export type IngredientT = z.infer<typeof Ingredient>
export type InstructionT = z.infer<typeof Instruction>
export type RecipeT = z.infer<typeof Recipe>
export type RecipesResponseT = z.infer<typeof RecipesResponse>

// Filters used for web recipe search via OpenAI web_search tool
export type RecipeSearchFilters = {
  query?: string
  country?: string
  includeIngredients?: string[]
  excludeIngredients?: string[]
  maxResults?: number // 5..10 (default 5)
  excludeSources?: string[]
  detailedInstructions?: boolean
  imageFallback?: boolean
}

// Structured Outputs compatible JSON Schema for the response
// Aligns 1:1 with the Zod schemas defined above
export const recipesJsonSchema = {
  name: 'recipes_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      recipes: {
        type: 'array',
        minItems: 0,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            cuisine: { type: 'string' },
            source: { type: 'string' },
            image: { type: 'string' },
            servings: { type: 'integer', minimum: 1 },
            total_time_minutes: { type: 'integer', minimum: 0 },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            ingredients: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  item: { type: 'string' },
                  quantity: { type: ['number', 'string'] },
                  unit: { type: 'string' },
                  notes: { type: 'string' },
                },
                required: ['item'],
              },
            },
            instructions: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  step: { type: 'integer', minimum: 1 },
                  text: { type: 'string' },
                },
                required: ['step', 'text'],
              },
            },
            nutrition: {
              type: 'object',
              additionalProperties: false,
              properties: {
                calories: { type: 'integer', minimum: 0 },
                protein_g: { type: 'number', minimum: 0 },
                fat_g: { type: 'number', minimum: 0 },
                carbs_g: { type: 'number', minimum: 0 },
              },
            },
          },
          required: ['title', 'source', 'ingredients', 'instructions'],
        },
      },
      meta: {
        type: 'object',
        additionalProperties: false,
        properties: {
          has_more: { type: 'boolean' },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
              },
              required: ['url'],
            },
          },
          used_filters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              query: { type: 'string' },
              country: { type: 'string' },
              includeIngredients: { type: 'array', items: { type: 'string' } },
              excludeIngredients: { type: 'array', items: { type: 'string' } },
              maxResults: { type: 'integer', minimum: 1, maximum: 10 },
              excludeSources: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        required: ['has_more', 'sources', 'used_filters'],
      },
    },
    required: ['recipes', 'meta'],
  },
  strict: false,
} as const
