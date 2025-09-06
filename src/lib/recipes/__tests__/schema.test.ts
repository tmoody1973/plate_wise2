import { RecipesResponse, Recipe, Ingredient, Instruction, Nutrition } from '@/lib/recipes/schema'

describe('RecipesResponse Zod schema', () => {
  it('accepts a minimal valid payload', () => {
    const sample = {
      recipes: [
        {
          title: 'Test Recipe',
          source: 'https://example.com/recipe',
          ingredients: [{ item: 'Rice' }],
          instructions: [{ step: 1, text: 'Cook rice' }],
        },
      ],
      meta: {
        has_more: false,
        sources: [{ url: 'https://example.com/recipe', title: 'Example' }],
        used_filters: {
          query: 'rice',
          maxResults: 5,
        },
      },
    }
    const parsed = RecipesResponse.safeParse(sample)
    expect(parsed.success).toBe(true)
  })

  it('validates ingredient schema with all fields', () => {
    const ingredient = {
      item: 'Basmati Rice',
      quantity: 2,
      unit: 'cups',
      notes: 'Rinse before cooking'
    }
    const parsed = Ingredient.safeParse(ingredient)
    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual(ingredient)
  })

  it('validates instruction schema with proper step numbering', () => {
    const instruction = {
      step: 1,
      text: 'Rinse rice until water runs clear'
    }
    const parsed = Instruction.safeParse(instruction)
    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual(instruction)
  })

  it('validates nutrition schema with optional fields', () => {
    const nutrition = {
      calories: 350,
      protein_g: 8.5,
      fat_g: 2.1,
      carbs_g: 72.3
    }
    const parsed = Nutrition.safeParse(nutrition)
    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual(nutrition)
  })

  it('validates complete recipe with cultural context', () => {
    const recipe = {
      title: 'Persian Saffron Rice (Tahdig)',
      description: 'Traditional Persian rice with crispy bottom',
      cuisine: 'persian',
      source: 'https://example.com/persian-rice',
      image: 'https://example.com/rice-image.jpg',
      servings: 6,
      total_time_minutes: 45,
      difficulty: 'medium' as const,
      ingredients: [
        { item: 'Basmati rice', quantity: 2, unit: 'cups' },
        { item: 'Saffron', quantity: 0.5, unit: 'tsp', notes: 'Soaked in warm water' }
      ],
      instructions: [
        { step: 1, text: 'Soak saffron in warm water' },
        { step: 2, text: 'Rinse rice until water runs clear' }
      ],
      nutrition: {
        calories: 280,
        protein_g: 6.2,
        carbs_g: 58.1,
        fat_g: 1.8
      }
    }
    const parsed = Recipe.safeParse(recipe)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.cuisine).toBe('persian')
    expect(parsed.data?.difficulty).toBe('medium')
  })

  it('rejects invalid recipe with missing required fields', () => {
    const invalidRecipe = {
      title: 'Incomplete Recipe',
      // Missing source, ingredients, and instructions
    }
    const parsed = Recipe.safeParse(invalidRecipe)
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues).toHaveLength(3) // source, ingredients, instructions
  })

  it('validates recipe search response with cultural filters', () => {
    const response = {
      recipes: [
        {
          title: 'Middle Eastern Hummus',
          cuisine: 'middle_eastern',
          source: 'https://example.com/hummus',
          ingredients: [{ item: 'Chickpeas' }, { item: 'Tahini' }],
          instructions: [{ step: 1, text: 'Blend ingredients' }],
        }
      ],
      meta: {
        has_more: true,
        sources: [{ url: 'https://example.com/hummus' }],
        used_filters: {
          query: 'hummus',
          country: 'lebanon',
          includeIngredients: ['chickpeas'],
          excludeIngredients: ['garlic'],
          maxResults: 10
        }
      }
    }
    const parsed = RecipesResponse.safeParse(response)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.meta.used_filters.country).toBe('lebanon')
    expect(parsed.data?.meta.used_filters.includeIngredients).toContain('chickpeas')
  })
})

