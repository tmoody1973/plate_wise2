import type { UserProfile } from '@/types'
import { tavilyService } from '@/lib/external-apis/tavily-service'

export interface RecipeRecommendation {
  id: string
  title: string
  url: string
  source: string
  summary: string
  cuisineTags: string[]
  dietaryTags: string[]
}

function buildQueryFromProfile(profile: Partial<UserProfile>): string {
  const cuisines = profile?.preferences?.culturalCuisines?.join(', ')
  const dietary = profile?.preferences?.dietaryRestrictions?.join(', ')
  const allergies = profile?.preferences?.allergies?.join(', ')
  const budget = profile?.budget?.monthlyLimit ? `budget friendly` : ''
  const time = profile?.cookingProfile?.availableTime

  const parts = [
    cuisines ? `${cuisines} recipes` : 'family recipes',
    dietary ? `${dietary}` : '',
    allergies ? `without ${allergies}` : '',
    budget,
    time ? `ready in under ${Math.max(15, Math.min(60, time))} minutes` : '',
  ].filter(Boolean)

  return parts.join(' ').trim()
}

export async function recommendRecipesFromProfile(profile: Partial<UserProfile>): Promise<RecipeRecommendation[]> {
  const query = buildQueryFromProfile(profile)
  const res = await tavilyService.search(query, {
    searchDepth: 'basic',
    includeDomains: [],
    maxResults: 5,
  })

  const cuisineTags = profile?.preferences?.culturalCuisines ?? []
  const dietaryTags = profile?.preferences?.dietaryRestrictions ?? []

  return res.results.map((r, idx) => ({
    id: `rec_${idx}_${Math.random().toString(36).slice(2)}`,
    title: r.title,
    url: r.url,
    source: new URL(r.url).hostname,
    summary: r.content?.slice(0, 240) ?? '',
    cuisineTags,
    dietaryTags,
  }))
}

