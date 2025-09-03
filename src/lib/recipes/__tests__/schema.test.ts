import { RecipesResponse } from '@/lib/recipes/schema'

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
})

