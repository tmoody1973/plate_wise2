import { buildPerplexityPrompt } from '@/lib/pricing/perplexity-prompt'

describe('buildPerplexityPrompt', () => {
  const opts = {
    ingredient: 'saffron',
    zip: '53202',
    context: 'Middle Eastern',
    amount: 2,
    unit: 'oz',
    city: 'Milwaukee',
    defaultStore: "Pick 'n Save",
  }

  it('includes the ingredient and ZIP/city/context details', () => {
    const prompt = buildPerplexityPrompt(opts)
    expect(prompt).toContain('saffron')
    expect(prompt).toContain('ZIP code 53202')
    expect(prompt).toContain('Cultural context: Middle Eastern')
    expect(prompt).toContain('Amount needed: 2 oz')
    expect(prompt).toContain('User city: Milwaukee')
  })

  it('includes explicit grocery chains list', () => {
    const prompt = buildPerplexityPrompt(opts)
    const chains = [
      "Pick 'n Save",
      'Metro Market',
      'Fresh Thyme',
      "Kroger's",
      "Woodman's",
      'Walmart',
      'Target',
      'Aldi',
      'Costco',
      "Sam's Club",
      'Whole Foods',
      'Meijer',
      'H‑E‑B',
      'Jewel‑Osco',
      'Safeway/Albertsons',
      'Publix',
    ]
    chains.forEach(name => {
      expect(prompt).toContain(name)
    })
  })

  it('includes sorting requirement by portionCost low to high', () => {
    const prompt = buildPerplexityPrompt(opts)
    expect(prompt).toContain('Sort the results by portionCost from low to high')
  })

  it('includes default-store inclusion rule', () => {
    const prompt = buildPerplexityPrompt(opts)
    expect(prompt).toContain("always include it as one of the TOP 3")
    expect(prompt).toContain("Pick 'n Save")
  })
})

