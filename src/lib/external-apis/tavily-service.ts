/**
 * Tavily Search API wrapper
 * Used to retrieve high-quality web context for recipe recommendations.
 */

export interface TavilySearchOptions {
  searchDepth?: 'basic' | 'advanced'
  includeDomains?: string[]
  excludeDomains?: string[]
  maxResults?: number
}

export interface TavilyResult {
  title: string
  url: string
  content: string
}

export interface TavilySearchResponse {
  query: string
  answer?: string
  results: TavilyResult[]
}

export class TavilyService {
  private endpoint = 'https://api.tavily.com/search'
  private mock: boolean

  constructor() {
    const flag = process.env.NEXT_PUBLIC_TAVILY_MOCK
    if (typeof flag !== 'undefined') {
      this.mock = !(flag === 'false' || flag === '0')
    } else {
      // Default to live when API key is present; mock only if missing key
      this.mock = !process.env.TAVILY_API_KEY
    }
  }

  async search(query: string, opts: TavilySearchOptions = {}): Promise<TavilySearchResponse> {
    if (this.mock) {
      return this.mockSearch(query, opts)
    }

    const apiKey = process.env.TAVILY_API_KEY
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY not set')
    }

    const body = {
      api_key: apiKey,
      query,
      search_depth: opts.searchDepth ?? 'basic',
      include_domains: opts.includeDomains ?? [],
      exclude_domains: opts.excludeDomains ?? [],
      max_results: opts.maxResults ?? 5,
    }

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`tavily_failed: ${res.status} ${text?.slice(0,120)}`)
    }

    const data = await res.json()
    return {
      query,
      answer: data.answer,
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content || r.snippet || '',
      })),
    }
  }

  private mockSearch(query: string, opts: TavilySearchOptions): TavilySearchResponse {
    return {
      query,
      results: [
        {
          title: 'Budget-Friendly Mediterranean Chickpea Stew',
          url: 'https://example.com/recipes/mediterranean-chickpea-stew',
          content: 'Hearty tomato-based stew with chickpeas, spinach, and warm spices. 30 minutes.'
        },
        {
          title: 'Quick Garlic Lemon Pasta (Mediterranean)',
          url: 'https://example.com/recipes/garlic-lemon-pasta',
          content: 'Simple pasta with olive oil, garlic, lemon, and parsley. Under $5/serving.'
        },
        {
          title: 'Grilled Chicken with Herb Yogurt',
          url: 'https://example.com/recipes/herb-yogurt-chicken',
          content: 'Yogurt-marinated chicken; budget-friendly and high protein.'
        },
      ],
    }
  }
}

export const tavilyService = new TavilyService()
