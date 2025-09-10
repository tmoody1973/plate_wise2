'use client';

import { useState, useEffect } from 'react';
import RecipeExpandableCard from './RecipeExpandableCard';
import { useAuthContext } from '@/contexts/AuthContext';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { recipeDatabaseService, type CreateRecipeInput } from '@/lib/recipes/recipe-database-service';
import { useToast } from '@/components/ui/toast';
import { createUniqueRecipeSlug } from '@/lib/utils/slug';

interface Recipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Array<{
    id: string;
    name: string;
    amount: string;
    unit: string;
    originalName: string;
    isSubstituted: boolean;
    userStatus: 'normal' | 'already-have' | 'specialty-store';
    specialtyStore?: string;
    krogerPrice?: {
      unitPrice: number;
      totalCost: number;
      confidence: string;
      storeLocation?: string;
      onSale?: boolean;
      salePrice?: number;
      productName: string;
      size: string;
      brand: string;
      // Enhanced pricing metadata
      packageCount?: number;
      baseUnit?: 'g' | 'ml' | 'each';
      packageSize?: number; // in baseUnit
      requiredAmount?: number; // in baseUnit
      leftoverAmount?: number; // in baseUnit
      alternatives: Array<{
        name: string;
        price: number;
        brand: string;
        size: string;
      }>;
    };
  }>;
  instructions: string[];
  metadata: {
    servings: number;
    totalTime: number;
    estimatedTime: number;
  };
  pricing?: {
    totalCost: number;
    costPerServing: number;
    budgetFriendly: boolean;
    savingsOpportunities: string[];
    storeLocation?: string;
    excludedFromTotal: number; // Cost of items marked as "already have"
    specialtyStoreCost: number; // Cost of specialty items
  };
  imageUrl?: string;
  sourceUrl?: string;
  hasPricing: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  cleanName: string;
  price: number;
  salePrice?: number;
  onSale: boolean;
  size: string;
  brand: string;
  confidence: string;
  isBestMatch: boolean;
}

// ----- Pricing helpers -----
function normalizeVulgarFractions(s: string): string {
  return (s || '')
    .replace(/¼/g, '1/4').replace(/½/g, '1/2').replace(/¾/g, '3/4')
    .replace(/⅐/g, '1/7').replace(/⅑/g, '1/9').replace(/⅒/g, '1/10')
    .replace(/⅓/g, '1/3').replace(/⅔/g, '2/3')
    .replace(/⅕/g, '1/5').replace(/⅖/g, '2/5').replace(/⅗/g, '3/5').replace(/⅘/g, '4/5')
    .replace(/⅙/g, '1/6').replace(/⅚/g, '5/6')
    .replace(/⅛/g, '1/8').replace(/⅜/g, '3/8').replace(/⅝/g, '5/8').replace(/⅞/g, '7/8')
}

function parseMixedNumber(s: string): number {
  const t = normalizeVulgarFractions(s).trim()
  const m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return parseFloat(m[1]!) + (parseFloat(m[2]!) / parseFloat(m[3]!))
  const f = t.match(/^(\d+)\/(\d+)$/)
  if (f) return parseFloat(f[1]!) / parseFloat(f[2]!)
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

function toBaseUnits(amount: number, unit: string): { value: number; base: 'g'|'ml'|'each' } {
  const u = (unit || '').toLowerCase()
  // weight
  if (['g','gram','grams'].includes(u)) return { value: amount, base: 'g' }
  if (['kg','kilogram','kilograms'].includes(u)) return { value: amount * 1000, base: 'g' }
  if (['oz','ounce','ounces'].includes(u)) return { value: amount * 28.3495, base: 'g' }
  if (['lb','pound','pounds'].includes(u)) return { value: amount * 453.592, base: 'g' }
  // volume
  if (['ml','milliliter','milliliters'].includes(u)) return { value: amount, base: 'ml' }
  if (['l','liter','liters'].includes(u)) return { value: amount * 1000, base: 'ml' }
  if (['tsp','teaspoon','teaspoons'].includes(u)) return { value: amount * 4.92892, base: 'ml' }
  if (['tbsp','tablespoon','tablespoons'].includes(u)) return { value: amount * 14.7868, base: 'ml' }
  if (['cup','cups'].includes(u)) return { value: amount * 236.588, base: 'ml' }
  // each-like
  if (['clove','cloves','piece','pieces','slice','slices','can','cans','package','packages'].includes(u)) return { value: amount, base: 'each' }
  // default fallback
  return { value: amount, base: 'each' }
}

function parseSizeToBase(size: string): { qty: number; base: 'g'|'ml'|'each' } | null {
  const s = (size || '').toLowerCase()
  // Normalize common variants
  const norm = s.replace(/fl\s*oz/g, 'floz').replace(/fluid\s*ounce(s)?/g, 'floz')
  // Extract weight/volume patterns like 14 oz, 500g, 1 lb, 33.8 floz, 1 l
  const m = norm.match(/(\d+(?:\.\d+)?)\s*(floz|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|l|liter|liters|ml|milliliter|milliliters)\b/)
  if (m) {
    const qty = parseFloat(m[1] || '0')
    const unit = m[2] || ''
    // Map floz to ml explicitly
    const conv = unit === 'floz' ? { value: qty * 29.5735, base: 'ml' as const } : toBaseUnits(qty, unit)
    return { qty: conv.value, base: conv.base }
  }
  // Each fallback: check for counts like "12 count" or lack of units
  const c = norm.match(/(\d+)\s*(count|ct|pk|pack|pieces?)\b/)
  if (c) return { qty: parseFloat(c[1] || '1'), base: 'each' }
  return null
}

function computeIngredientCost(
  ingredient: { amount: string; unit: string },
  product: { price: number; size: string },
  byPackage: boolean = true
): { unitPrice: number; totalCost: number; packageCount: number; base: 'g'|'ml'|'each'; packageSize: number; required: number; leftover: number; adjusted?: boolean } | null {
  const reqAmt = parseMixedNumber(ingredient.amount || '0')
  const reqConv = toBaseUnits(reqAmt, ingredient.unit || '')
  let pack = parseSizeToBase(product.size || '')
  if (!Number.isFinite(product.price) || product.price <= 0) return null
  let adjusted = false
  // If we cannot parse size or it is count while ingredient needs weight/volume, assume typical package
  const DEFAULTS: Record<'g'|'ml', number> = { g: 454, ml: 473 }
  if (!pack) {
    if (reqConv.base !== 'each') { pack = { qty: DEFAULTS[reqConv.base], base: reqConv.base }; adjusted = true }
    else { pack = { qty: 1, base: 'each' }; adjusted = true }
  }
  if (pack.base === 'each' && reqConv.base !== 'each') { pack = { qty: DEFAULTS[reqConv.base], base: reqConv.base }; adjusted = true }
  const unitPrice = product.price / (pack.qty || 1)
  if (byPackage) {
    let packages = Math.max(1, Math.ceil((reqConv.value || 0) / pack.qty))
    // sanity guard: if we need more than 20 packages for a small amount, clamp to 1 and mark adjusted
    if ((reqConv.value || 0) > 0 && packages > 20 && (reqConv.value || 0) < 2000) { packages = 1; adjusted = true }
    const total = packages * product.price
    const leftover = packages * pack.qty - (reqConv.value || 0)
    return { unitPrice, totalCost: total, packageCount: packages, base: pack.base, packageSize: pack.qty, required: reqConv.value || 0, leftover: Math.max(0, leftover), adjusted }
  } else {
    const total = (reqConv.value || 0) * unitPrice
    return { unitPrice, totalCost: total, packageCount: 1, base: pack.base, packageSize: pack.qty, required: reqConv.value || 0, leftover: Math.max(0, pack.qty - (reqConv.value || 0)), adjusted }
  }
}

export default function MealPlannerV2() {
  const [step, setStep] = useState<'configure' | 'recipes' | 'pricing'>('configure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [zipCode, setZipCode] = useState('90210');
  
  // Configuration state
  const [config, setConfig] = useState({
    culturalCuisines: ['mexican'] as string[],
    dietaryRestrictions: [] as string[],
    allergies: [] as string[],
    dislikes: [] as string[],
    includeIngredients: [] as string[],
    excludeIngredients: [] as string[],
    country: '',
    mealCount: 7,
    mealTypes: ['dinner'] as Array<'breakfast'|'lunch'|'dinner'>,
    costMode: 'package' as 'package' | 'proportional',
    householdSize: 4,
    availableTime: 'standard',
    weeklyBudget: 75,
    religiousRestrictions: [] as string[],
    skillLevel: 'intermediate',
    equipment: [] as string[],
    timeFrame: 'week'
  });

  // Ingredient substitution state
  const [searchingIngredient, setSearchingIngredient] = useState<{
    recipeId: string;
    ingredientId: string;
    query: string;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const [mounted, setMounted] = useState(false);
  const { user } = useAuthContext();
  const { profile } = useProfileSetup();
  const { addToast } = useToast();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{ index: number; total: number } | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('mealplan-advanced-open')
      if (saved != null) setAdvancedOpen(saved === '1')
    } catch {}
  }, []);

  // Prefill config from profile once available
  useEffect(() => {
    if (!profile) return;
    const prefs: any = profile.preferences || {};
    const cook: any = (profile as any).cookingProfile || (profile as any).cooking_profile || {};
    const budget: any = profile.budget || {};
    const loc: any = profile.location || {};
    setConfig(prev => ({
      ...prev,
      culturalCuisines: Array.isArray(prefs.culturalCuisines) && prefs.culturalCuisines.length ? prefs.culturalCuisines : prev.culturalCuisines,
      dietaryRestrictions: Array.isArray(prefs.dietaryRestrictions) ? prefs.dietaryRestrictions : prev.dietaryRestrictions,
      allergies: Array.isArray(prefs.allergies) ? prefs.allergies : prev.allergies,
      dislikes: Array.isArray(prefs.dislikes) ? prefs.dislikes : prev.dislikes,
      excludeIngredients: (Array.isArray(prefs.dislikes) || Array.isArray(prefs.allergies)) ? Array.from(new Set([...(prefs.dislikes||[]), ...(prefs.allergies||[])])).filter(Boolean) : prev.excludeIngredients,
      // If user has a US state, default country to United States for convenience
      country: prev.country || (loc?.state ? 'United States' : ''),
      householdSize: Number((budget as any).householdSize) || prev.householdSize,
      availableTime: String(cook.availableTime || prev.availableTime).toLowerCase().includes('quick') ? 'quick' : 'standard',
      weeklyBudget: Number((budget as any).monthlyLimit) ? Math.round(Number((budget as any).monthlyLimit) / 4) : prev.weeklyBudget,
      religiousRestrictions: Array.isArray(prefs.religiousRestrictions) ? prefs.religiousRestrictions : prev.religiousRestrictions,
      skillLevel: String(cook.skillLevel || prev.skillLevel),
      equipment: Array.isArray(cook.equipment) ? cook.equipment : prev.equipment,
    }))
    if (loc?.zipCode) setZipCode(loc.zipCode)
  }, [profile])

  // Persist advanced panel preference
  useEffect(() => {
    try { localStorage.setItem('mealplan-advanced-open', advancedOpen ? '1' : '0') } catch {}
  }, [advancedOpen])

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // Step 1: Generate recipes without pricing
  const generateRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const includeIngredients = config.includeIngredients
      const excludeIngredients = [...new Set([...(config.excludeIngredients||[]), ...config.allergies, ...config.dislikes])].filter(Boolean)
      const response = await fetch('/api/meal-plans/recipes-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          culturalCuisines: config.culturalCuisines,
          dietaryRestrictions: config.dietaryRestrictions,
          includeIngredients,
          excludeIngredients,
          country: config.country || undefined,
          mealCount: config.mealCount,
          mealTypes: config.mealTypes,
          householdSize: config.householdSize,
          timeFrame: config.availableTime === 'quick' ? 'quick-week' : 'week',
        })
      });
      
      // Check if response is ok
      if (!response.ok) {
        // Try to read server error details
        const errText = await response.text().catch(() => '')
        try {
          const j = JSON.parse(errText)
          throw new Error(j?.error || `Server error: ${response.status} ${response.statusText}`)
        } catch {
          throw new Error(errText || `Server error: ${response.status} ${response.statusText}`)
        }
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }
      
      const data = await response.json();
      if (data.success) {
        setRecipes(data.data.recipes);
        setStep('recipes');
      } else {
        setError(data.error || 'Failed to generate recipes. Please try again.');
      }
    } catch (error) {
      console.error('Recipe generation failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          setError('Server error: Please check if the development server is running correctly.');
        } else {
          setError(`Error: ${error.message}`);
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1 (alt): Generate recipes using the signed-in user's cultural profile
  const generateFromProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/meal-plans/recipes-from-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          culturalCuisines: config.culturalCuisines,
          dietaryRestrictions: config.dietaryRestrictions,
          includeIngredients: config.includeIngredients,
          excludeIngredients: [...new Set([...(config.excludeIngredients||[]), ...config.allergies, ...config.dislikes])].filter(Boolean),
          country: config.country || undefined,
          mealCount: config.mealCount,
          mealTypes: config.mealTypes,
          allergies: config.allergies,
          dislikes: config.dislikes,
          householdSize: config.householdSize,
          availableTime: config.availableTime,
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        if (response.status === 401) throw new Error('Please sign in to use your cultural profile');
        try {
          const j = JSON.parse(errText)
          throw new Error(j?.error || `Server error: ${response.status} ${response.statusText}`)
        } catch {
          throw new Error(errText || `Server error: ${response.status} ${response.statusText}`)
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }

      const data = await response.json();
      if (data.success) {
        setRecipes(data.data.recipes);
        setStep('recipes');
      } else {
        setError(data.error || 'Failed to generate recipes from your profile.');
      }
    } catch (error) {
      console.error('Profile-based recipe generation failed:', error);
      setError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Add pricing to recipes
  const addPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/meal-plans/add-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes, zipCode, mode: config.costMode })
      });
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }
      
      const data = await response.json();
      if (data.success) {
        setRecipes(data.data.recipes);
        setStep('pricing');
      } else {
        setError(data.error || 'Failed to get pricing information. Please try again.');
      }
    } catch (error) {
      console.error('Pricing addition failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          setError('Server error: Please check if the development server is running correctly.');
        } else {
          setError(`Error: ${error.message}`);
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Stream recipes from profile, adding them one by one
  const streamFromProfile = async () => {
    try {
      setError(null);
      setRecipes([]);
      setStep('configure');
      setIsStreaming(true);
      setStreamProgress({ index: 0, total: config.mealCount });

      const params = new URLSearchParams();
      if (config.culturalCuisines.length) params.set('cuisines', config.culturalCuisines.join(','));
      if (config.dietaryRestrictions.length) params.set('dietary', config.dietaryRestrictions.join(','));
      if (config.allergies.length) params.set('allergies', config.allergies.join(','));
      if (config.dislikes.length) params.set('dislikes', config.dislikes.join(','));
      if (config.includeIngredients.length) params.set('include', config.includeIngredients.join(','));
      if (config.excludeIngredients.length) params.set('exclude', config.excludeIngredients.join(','));
      if (config.country) params.set('country', config.country);
      params.set('availableTime', config.availableTime);
      params.set('householdSize', String(config.householdSize));
      params.set('total', String(config.mealCount));
      params.set('mealTypes', config.mealTypes.join(','));
      const es = new EventSource(`/api/meal-plans/recipes-from-profile/stream?${params.toString()}`);

      es.addEventListener('progress', (ev: MessageEvent) => {
        try {
          const p = JSON.parse(ev.data);
          if (typeof p?.index === 'number' && typeof p?.total === 'number') {
            setStreamProgress({ index: Math.min(p.index, p.total), total: p.total });
          }
        } catch {}
      });

      es.addEventListener('recipe', (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.recipe) {
            setRecipes(prev => [...prev, payload.recipe]);
            setStep('recipes');
          }
        } catch {}
      });

      es.addEventListener('warning', (ev: MessageEvent) => {
        // Non-fatal slot issues; we can surface if desired
        console.warn('stream warning', ev.data);
      });

      es.addEventListener('error', (ev: MessageEvent) => {
        try {
          const e = JSON.parse((ev as any).data || '{}');
          setError(e?.message || 'Streaming error');
        } catch {
          setError('Streaming error');
        } finally {
          es.close();
          setIsStreaming(false);
        }
      });

      es.addEventListener('done', (ev: MessageEvent) => {
        setIsStreaming(false);
        setStreamProgress(null);
        es.close();
      });

      // Safety: close stream after 60s
      setTimeout(() => { try { es.close(); } catch {} }, 60000);
    } catch (e: any) {
      setIsStreaming(false);
      setError(e?.message || 'Failed to start streaming');
    }
  };

  // Swap a single recipe slot using streaming endpoint (first match wins)
  const swapRecipeAt = async (index: number) => {
    try {
      const current = recipes[index]
      if (!current) return
      setError(null)
      setIsStreaming(true)
      setReplacingIndex(index)
      setStreamProgress({ index: 0, total: 1 })

      const exclude = recipes.map(r => r.sourceUrl).filter(Boolean).join(',')
      const params = new URLSearchParams()
      params.set('cuisines', current.cuisine)
      if (config.dietaryRestrictions.length) params.set('dietary', config.dietaryRestrictions.join(','))
      if (config.allergies.length) params.set('allergies', config.allergies.join(','))
      if (config.dislikes.length) params.set('dislikes', config.dislikes.join(','))
      params.set('availableTime', config.availableTime)
      params.set('householdSize', String(config.householdSize))
      params.set('total', '1')
      if (exclude) params.set('exclude', exclude)

      const es = new EventSource(`/api/meal-plans/recipes-from-profile/stream?${params.toString()}`)

      const closeAll = () => { try { es.close() } catch {} setIsStreaming(false); setStreamProgress(null); setReplacingIndex(null) }

      es.addEventListener('recipe', (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data)
          const r = payload?.recipe
          if (r) {
            setRecipes(prev => prev.map((it, i) => (i === index ? r : it)))
            setStep('recipes')
          }
        } catch {}
      })
      es.addEventListener('done', () => closeAll())
      es.addEventListener('error', (ev: MessageEvent) => { try { const e = JSON.parse((ev as any).data || '{}'); setError(e?.message || 'Streaming error') } catch { setError('Streaming error') } finally { closeAll() } })
      setTimeout(closeAll, 30000)
    } catch (e: any) {
      setError(e?.message || 'Failed to swap recipe')
      setIsStreaming(false)
      setStreamProgress(null)
    }
  }

  // Save a recipe to user's database
  const saveRecipeAt = async (index: number) => {
    try {
      if (!user?.id) { setError('Please sign in to save recipes'); return }
      const r = recipes[index]
      if (!r) return
      setSavingIndex(index)

      // parse quantity like "1 1/2", "1/2", "2.5"
      const fracToNumber = (s: string): number => {
        const parts = s.trim().split(/\s+/)
        const p0 = parts[0] || ''
        const p1 = parts[1] || ''
        if (parts.length === 2 && /\d+[\/\d]+/.test(p1) && /^\d+$/.test(p0)) {
          const whole = parseFloat(p0)
          const [a, b] = p1.split('/')
          const frac = parseFloat(a || '0') / parseFloat(b || '1')
          return whole + (isFinite(frac) ? frac : 0)
        }
        if (/\d+\/\d+/.test(s)) {
          const [a, b] = s.split('/')
          const frac = parseFloat(a || '0') / parseFloat(b || '1')
          return isFinite(frac) ? frac : 0
        }
        const n = parseFloat(s)
        return Number.isFinite(n) ? n : 0
      }
      const parseQty = (q: unknown): number => {
        if (q == null) return 0
        if (typeof q === 'number') return q
        if (typeof q === 'string') {
          const m = q.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/)
          return m ? fracToNumber(m[1]!) : 0
        }
        return 0
      }

      const makeInput = (): CreateRecipeInput => ({
        title: r.title,
        description: r.description || '',
        culturalOrigin: r.culturalOrigin || [r.cuisine],
        cuisine: r.cuisine || 'international',
        ingredients: r.ingredients.map((ing, i) => ({
          id: `ing_${i + 1}`,
          name: ing.name,
          amount: parseQty(ing.amount),
          unit: ing.unit || '',
          substitutes: [],
          costPerUnit: 0,
          availability: [],
        })),
        instructions: (Array.isArray(r.instructions) ? r.instructions : []).map((it: any, i: number) => ({
          step: typeof it?.step === 'number' ? it.step : i + 1,
          description: typeof it === 'string' ? it : (it?.description || it?.text || `Step ${i + 1}`),
        })),
        metadata: {
          servings: r.metadata.servings || 4,
          prepTime: Math.floor((r.metadata.totalTime || 40) * 0.3),
          cookTime: Math.floor((r.metadata.totalTime || 40) * 0.7),
          totalTime: r.metadata.totalTime || 40,
          difficulty: 'medium',
          culturalAuthenticity: 8,
          imageUrl: r.imageUrl || undefined,
          sourceUrl: r.sourceUrl || undefined,
        },
        nutritionalInfo: undefined,
        costAnalysis: undefined,
        tags: [],
        source: 'community',
        isPublic: true,
      })

      const input = makeInput()
      const saved = await recipeDatabaseService.createRecipe(input, user.id)
      if (!saved) throw new Error('Failed to save recipe')
      setSavedIndices(prev => new Set(prev).add(index))
      const slug = createUniqueRecipeSlug(saved.title, saved.id)
      addToast({ type: 'success', title: 'Saved to My Recipes', message: `View: /recipes/${slug}` })
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSavingIndex(null)
    }
  }

  // Search for ingredient alternatives
  const searchIngredient = async (recipeId: string, ingredientId: string, query: string) => {
    setSearchingIngredient({ recipeId, ingredientId, query });
    setCustomSearchQuery(query);
    setSearchLoading(true);
    
    try {
      const response = await fetch(
        `/api/ingredients/search?q=${encodeURIComponent(query)}&zipCode=${zipCode}&limit=8`
      );
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Ingredient search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Custom search with user input
  const performCustomSearch = async () => {
    if (!customSearchQuery.trim() || !searchingIngredient) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/ingredients/search?q=${encodeURIComponent(customSearchQuery)}&zipCode=${zipCode}&limit=8`
      );
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Custom search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Substitute ingredient
  const substituteIngredient = (searchResult: SearchResult) => {
    if (!searchingIngredient) return;
    
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === searchingIngredient.recipeId) {
        const updatedRecipe = {
          ...recipe,
          ingredients: recipe.ingredients.map(ing => {
            if (ing.id === searchingIngredient.ingredientId) {
              // Compute smarter per-unit cost
              const comp = computeIngredientCost(
                { amount: ing.amount, unit: ing.unit },
                { price: searchResult.onSale && searchResult.salePrice ? searchResult.salePrice : searchResult.price, size: searchResult.size },
                config.costMode !== 'proportional'
              )
              return {
                ...ing,
                name: searchResult.cleanName,
                isSubstituted: true,
                userStatus: 'normal' as const,
                krogerPrice: comp ? {
                  unitPrice: comp.unitPrice,
                  totalCost: comp.totalCost,
                  confidence: searchResult.confidence,
                  onSale: searchResult.onSale,
                  salePrice: searchResult.salePrice,
                  productName: searchResult.name,
                  size: searchResult.size,
                  brand: searchResult.brand,
                  packageCount: comp.packageCount,
                  baseUnit: comp.base,
                  packageSize: comp.packageSize,
                  requiredAmount: comp.required,
                  leftoverAmount: comp.leftover,
                  alternatives: []
                } : undefined
              };
            }
            return ing;
          })
        };
        
        // Recalculate pricing if recipe has pricing
        if (updatedRecipe.hasPricing) {
          return recalculateRecipePricing(updatedRecipe);
        }
        return updatedRecipe;
      }
      return recipe;
    }));
    
    setSearchingIngredient(null);
    setSearchResults([]);
    setCustomSearchQuery('');
  };

  // Mark ingredient status (already have, specialty store, etc.)
  const updateIngredientStatus = (
    recipeId: string, 
    ingredientId: string, 
    status: 'normal' | 'already-have' | 'specialty-store',
    specialtyStore?: string
  ) => {
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === recipeId) {
        const updatedRecipe = {
          ...recipe,
          ingredients: recipe.ingredients.map(ing => {
            if (ing.id === ingredientId) {
              return {
                ...ing,
                userStatus: status,
                specialtyStore: status === 'specialty-store' ? specialtyStore : undefined
              };
            }
            return ing;
          })
        };
        
        // Recalculate pricing if recipe has pricing
        if (updatedRecipe.hasPricing) {
          return recalculateRecipePricing(updatedRecipe);
        }
        return updatedRecipe;
      }
      return recipe;
    }));
  };

  // Update ingredient unit quickly and reprice if possible
  const updateIngredientUnit = (recipeId: string, ingredientId: string, newUnit: string) => {
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id !== recipeId) return recipe
      const updated = {
        ...recipe,
        ingredients: recipe.ingredients.map(ing => {
          if (ing.id !== ingredientId) return ing
          const next = { ...ing, unit: newUnit }
          // If we have an attached product, recompute pricing
          if (ing.krogerPrice && (ing.krogerPrice.size || ing.krogerPrice.unitPrice)) {
            const productPrice = ing.krogerPrice.salePrice ?? (ing.krogerPrice.unitPrice && ing.krogerPrice.packageSize ? ing.krogerPrice.unitPrice * ing.krogerPrice.packageSize : (ing.krogerPrice.totalCost / Math.max(1, ing.krogerPrice.packageCount || 1)))
            const comp = computeIngredientCost(
              { amount: next.amount, unit: next.unit },
              { price: productPrice || 0, size: ing.krogerPrice.size || '' },
              config.costMode !== 'proportional'
            )
            if (comp) {
              next.krogerPrice = {
                ...ing.krogerPrice,
                unitPrice: comp.unitPrice,
                totalCost: comp.totalCost,
                packageCount: comp.packageCount,
                baseUnit: comp.base,
                packageSize: comp.packageSize,
                requiredAmount: comp.required,
                leftoverAmount: comp.leftover,
                // keep onSale/salePrice/brand/productName/size
                adjusted: comp.adjusted,
              } as any
            }
          }
          return next
        })
      }
      // Recalc if priced
      return updated.hasPricing ? recalculateRecipePricing(updated) : updated
    }))
  }

  // Recalculate recipe pricing based on ingredient statuses
  const recalculateRecipePricing = (recipe: Recipe): Recipe => {
    if (!recipe.hasPricing || !recipe.pricing) return recipe;
    
    let totalCost = 0;
    let excludedFromTotal = 0;
    let specialtyStoreCost = 0;
    
    for (const ingredient of recipe.ingredients) {
      const cost = ingredient.krogerPrice?.totalCost || 0;
      
      switch (ingredient.userStatus) {
        case 'already-have':
          excludedFromTotal += cost;
          break;
        case 'specialty-store':
          specialtyStoreCost += cost;
          totalCost += cost; // Still count in total, but track separately
          break;
        default:
          totalCost += cost;
          break;
      }
    }
    
    return {
      ...recipe,
      pricing: {
        ...recipe.pricing,
        totalCost,
        costPerServing: totalCost / recipe.metadata.servings,
        excludedFromTotal,
        specialtyStoreCost
      }
    };
  };

  const cuisineOptions = [
    'mexican', 'italian', 'chinese', 'indian', 'thai', 'japanese', 
    'mediterranean', 'american', 'french', 'korean', 'vietnamese'
  ];



  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
                aria-label="Dismiss error"
              >
                <span className="sr-only">Dismiss</span>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Progress Steps */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep('configure')}
            disabled={loading}
            className={`flex items-center space-x-2 transition-colors ${
              step === 'configure' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            } ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Go to configuration step"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              step === 'configure' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>1</div>
            <span className="font-medium">Configure</span>
          </button>
          
          <button
            onClick={() => recipes.length > 0 && setStep('recipes')}
            disabled={loading || recipes.length === 0}
            className={`flex items-center space-x-2 transition-colors ${
              step === 'recipes' ? 'text-blue-600' : 
              recipes.length > 0 ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400'
            } ${loading || recipes.length === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Go to recipes step"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              step === 'recipes' ? 'bg-blue-600 text-white' : 
              recipes.length > 0 ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>2</div>
            <span className="font-medium">Recipes</span>
          </button>
          
          <button
            onClick={() => recipes.some(r => r.hasPricing) && setStep('pricing')}
            disabled={loading || !recipes.some(r => r.hasPricing)}
            className={`flex items-center space-x-2 transition-colors ${
              step === 'pricing' ? 'text-blue-600' : 
              recipes.some(r => r.hasPricing) ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400'
            } ${loading || !recipes.some(r => r.hasPricing) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Go to pricing step"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              step === 'pricing' ? 'bg-blue-600 text-white' : 
              recipes.some(r => r.hasPricing) ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>3</div>
            <span className="font-medium">Pricing</span>
          </button>
        </div>
      </div>

      {/* Step 1: Configuration (prefilled from profile) */}
      {step === 'configure' && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">🍽️ Meal Plan Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Cultural Cuisines</label>
              <select
                multiple
                value={config.culturalCuisines}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  culturalCuisines: Array.from(e.target.selectedOptions, option => option.value)
                }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                size={4}
              >
                {cuisineOptions.map(cuisine => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </option>
                ))}
              </select>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Dietary Restrictions</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['vegan','vegetarian','halal','kosher','dairy_free','gluten_free','low_sodium'].map(opt => (
                    <label key={opt} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.dietaryRestrictions.includes(opt)}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dietaryRestrictions: e.target.checked
                            ? Array.from(new Set([...prev.dietaryRestrictions, opt]))
                            : prev.dietaryRestrictions.filter(x => x !== opt)
                        }))}
                      />
                      <span>{opt.replace('_',' ').replace(/\b\w/g, c=>c.toUpperCase())}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Allergies (CSV)</label>
                <input
                  type="text"
                  value={config.allergies.join(', ')}
                  onChange={(e) => setConfig(prev => ({ ...prev, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="peanuts, shellfish"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Dislikes (CSV)</label>
                <input
                  type="text"
                  value={config.dislikes.join(', ')}
                  onChange={(e) => setConfig(prev => ({ ...prev, dislikes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="cilantro, liver"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of Meals</label>
              <div className="flex items-center gap-2 mb-4">
                <button
                  className="px-3 py-2 border rounded disabled:opacity-50"
                  onClick={() => setConfig(prev => ({ ...prev, mealCount: Math.max(1, prev.mealCount - 1) }))}
                  disabled={config.mealCount <= 1}
                  aria-label="Decrease meals"
                >−</button>
                <input
                  type="number"
                  min={1}
                  max={21}
                  className="w-20 p-2 border rounded text-center"
                  value={config.mealCount}
                  onChange={(e) => setConfig(prev => ({ ...prev, mealCount: Math.min(21, Math.max(1, parseInt(e.target.value) || 1)) }))}
                />
                <button
                  className="px-3 py-2 border rounded"
                  onClick={() => setConfig(prev => ({ ...prev, mealCount: Math.min(21, prev.mealCount + 1) }))}
                  aria-label="Increase meals"
                >+</button>
              </div>

              <label className="block text-sm font-medium mb-2">Meal Types</label>
              <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                {(['breakfast','lunch','dinner'] as const).map(mt => (
                  <label key={mt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.mealTypes.includes(mt)}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        mealTypes: e.target.checked
                          ? Array.from(new Set([...(prev.mealTypes||[]), mt])) as any
                          : (prev.mealTypes || []).filter(x => x !== mt) as any,
                      }))}
                    />
                    <span>{mt[0].toUpperCase() + mt.slice(1)}</span>
                  </label>
                ))}
              </div>

              <label className="block text-sm font-medium mb-2">Household Size</label>
              <input
                type="number"
                min="1"
                max="12"
                value={config.householdSize}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  householdSize: parseInt(e.target.value) || 4
                }))}
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
              />
              
              <div className="text-xs text-gray-500">Pricing uses your profile ZIP. <a className="text-blue-600 hover:underline" href="/profile/setup">Change in Profile</a></div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Available Time</label>
                  <select
                    value={config.availableTime}
                    onChange={(e) => setConfig(prev => ({ ...prev, availableTime: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="quick">Quick (≤ 30 min)</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Weekly Budget ($)</label>
                  <input
                    type="number"
                    value={config.weeklyBudget}
                    onChange={(e) => setConfig(prev => ({ ...prev, weeklyBudget: parseInt(e.target.value) || 75 }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <label className="block text-sm font-medium mb-2">Costing Mode</label>
              <div className="flex items-center gap-3 mb-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="costmode" checked={config.costMode === 'package'} onChange={() => setConfig(prev => ({ ...prev, costMode: 'package' }))} />
                  <span>Package (buy whole package)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="costmode" checked={config.costMode === 'proportional'} onChange={() => setConfig(prev => ({ ...prev, costMode: 'proportional' }))} />
                  <span>Proportional (per‑unit)</span>
                </label>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Religious Restrictions (CSV)</label>
                <input
                  type="text"
                  value={config.religiousRestrictions.join(', ')}
                  onChange={(e) => setConfig(prev => ({ ...prev, religiousRestrictions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="halal, kosher"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Skill Level</label>
                  <select
                    value={config.skillLevel}
                    onChange={(e) => setConfig(prev => ({ ...prev, skillLevel: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Equipment (CSV)</label>
                  <input
                    type="text"
                    value={config.equipment.join(', ')}
                    onChange={(e) => setConfig(prev => ({ ...prev, equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="wok, grill, instant pot"
                  />
                </div>
              </div>
            </div>
          </div>

          <details className="mt-2" open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer text-sm text-gray-700">More options</summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <select
                  value={config.country}
                  onChange={(e) => setConfig(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {['','United States','Canada','United Kingdom','Nigeria','Ghana','India','Mexico','Japan','Italy','France'].map(c => (
                    <option key={c} value={c}>{c || 'Any'}</option>
                  ))}
                </select>
              </div>
              <div>
                <ChipInput
                  label="Include Ingredients"
                  value={config.includeIngredients}
                  onChange={(arr) => setConfig(prev => ({ ...prev, includeIngredients: arr }))}
                  placeholder="Type and press Enter (e.g., chickpeas)"
                  suggestions={["chickpeas","spinach","tomatoes","garlic","onion","ginger","rice","beans"]}
                />
              </div>
              <div className="md:col-span-2">
                <ChipInput
                  label="Exclude Ingredients"
                  value={config.excludeIngredients || []}
                  onChange={(arr) => setConfig(prev => ({ ...prev, excludeIngredients: arr }))}
                  placeholder="Type and press Enter (e.g., cilantro)"
                  suggestions={["cilantro","shellfish","liver","peanuts","dairy","gluten"]}
                />
                <div className="text-xs text-gray-500 mt-1">Prefilled from your allergies and dislikes.</div>
              </div>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button
              onClick={generateRecipes}
              disabled={loading || config.culturalCuisines.length === 0 || !zipCode.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              aria-describedby="generate-help"
            >
              {loading ? '🔄 Finding Recipes...' : '🚀 Generate Recipes (Fast!)'}
            </button>
            <button
              onClick={generateFromProfile}
              disabled={loading}
              className="px-6 py-3 rounded-lg border hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
              title="Use your saved cultural profile to auto-select cuisines and filters"
            >
              🌍 Generate From My Profile
            </button>
            <button
              onClick={streamFromProfile}
              disabled={loading || isStreaming}
              className="px-6 py-3 rounded-lg border hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
              title="Stream recipes one by one from your profile"
            >
              {isStreaming ? '📡 Streaming…' : '📡 Stream From Profile'}
            </button>
          </div>
          
          {(config.culturalCuisines.length === 0 || !zipCode.trim()) && (
            <p id="generate-help" className="text-sm text-gray-600 mt-2">
              Please select at least one cuisine and enter a ZIP code to continue.
            </p>
          )}
        </div>
      )}

      {/* Step 2 & 3: Beautiful Card-Based Recipe Display */}
      {(step === 'recipes' || step === 'pricing') && recipes.length > 0 && (
        <div className="flex gap-8">
          {/* Main Recipe Cards Area */}
          <div className="flex-1">
            {/* Header with Budget Info */}
            <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Meal Plan</h2>
                  <div className="flex items-center gap-6 text-lg">
                    <span className="text-gray-600">Weekly Budget: <span className="font-semibold">$75</span></span>
                    <span className="text-gray-600">Number of Meals: <span className="font-semibold">{recipes.length}</span></span>
                    {isStreaming && streamProgress && (
                      <span className="text-blue-600">Streaming {streamProgress.index}/{streamProgress.total}</span>
                    )}
                  </div>
                </div>
                
                {step === 'pricing' && recipes.some(r => r.hasPricing) && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      ${Math.min(...recipes.filter(r => r.pricing).map(r => r.pricing!.totalCost * recipes.length)).toFixed(0)}–${Math.max(...recipes.filter(r => r.pricing).map(r => r.pricing!.totalCost * recipes.length)).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Estimated Total</div>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Confidence: High
                    </div>
                  </div>
                )}
                
                {step === 'recipes' && (
                  <button
                    onClick={addPricing}
                    disabled={loading}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
                  >
                    {loading ? '🛒 Getting Prices...' : '🛒 Accept Plan → Shopping'}
                  </button>
                )}
              </div>
            </div>

            {/* Recipe Expandable Cards */}
            <RecipeExpandableCard 
              recipes={recipes}
              onIngredientSearch={searchIngredient}
              onIngredientStatusUpdate={updateIngredientStatus}
              onSwapRecipe={(i) => swapRecipeAt(i)}
              replacingIndex={replacingIndex}
              onSaveRecipe={(i) => saveRecipeAt(i)}
              savedIndices={savedIndices}
              onIngredientUnitUpdate={updateIngredientUnit}
            />
          </div>

          {/* Sidebar - Only show when we have pricing */}
          {step === 'pricing' && recipes.some(r => r.hasPricing) && (
            <div className="w-80 space-y-6">
              {/* Money-Saving Suggestions */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lower My Total</h3>
                
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg mb-4 transition-colors">
                  <span className="text-gray-700 font-medium">💡 Money-Saving Suggestions</span>
                  <span className="text-gray-400">→</span>
                </button>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Pantry Items I Have</h4>
                  
                  {/* Calculate pantry savings */}
                  {(() => {
                    const pantryItems = recipes.flatMap(r => 
                      r.ingredients.filter(i => i.userStatus === 'already-have')
                    );
                    const uniquePantryItems = Array.from(
                      new Map(pantryItems.map(item => [item.name, item])).values()
                    ).slice(0, 4);

                    return uniquePantryItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-green-600 font-medium">
                          +${item.krogerPrice?.totalCost.toFixed(0) || '3'}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingredient Search Modal */}
      {searchingIngredient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSearchingIngredient(null);
              setSearchResults([]);
              setCustomSearchQuery('');
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-modal-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 id="search-modal-title" className="text-lg font-semibold">
                🔍 Find alternatives for "{searchingIngredient.query}"
              </h3>
              <button
                onClick={() => {
                  setSearchingIngredient(null);
                  setSearchResults([]);
                  setCustomSearchQuery('');
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label="Close search modal"
              >
                ✕
              </button>
            </div>

            {/* Custom Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Search for different ingredient:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performCustomSearch()}
                  placeholder="e.g., organic chicken, ground turkey, tofu..."
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={performCustomSearch}
                  disabled={searchLoading || !customSearchQuery.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>

            {searchLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Searching Kroger...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.id}-${index}`}
                    onClick={() => substituteIngredient(result)}
                    className="flex justify-between items-center p-3 border rounded hover:bg-blue-50 cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">{result.cleanName}</div>
                      <div className="text-sm text-gray-600">
                        {result.brand} • {result.size}
                        {(() => {
                          const pack = parseSizeToBase(result.size)
                          if (!pack) return null
                          const unitPrice = (result.onSale && result.salePrice ? result.salePrice : result.price) / (pack.qty || 1)
                          return <span className="ml-2 text-gray-500">(${unitPrice.toFixed(2)} per {pack.base})</span>
                        })()}
                        {result.isBestMatch && <span className="ml-2 text-blue-600 text-xs">BEST MATCH</span>}
                      </div>
                      {(() => {
                        // Coverage preview against current ingredient
                        try {
                          const rec = recipes.find(r => r.id === searchingIngredient?.recipeId)
                          const ing = rec?.ingredients.find(i => i.id === searchingIngredient?.ingredientId)
                          if (!ing) return null
                          const comp = computeIngredientCost({ amount: ing.amount, unit: ing.unit }, { price: result.onSale && result.salePrice ? result.salePrice : result.price, size: result.size }, true)
                          if (!comp) return null
                          const needed = Math.round(comp.required)
                          const packSz = Math.round(comp.packageSize)
                          const leftover = Math.max(0, Math.round(comp.leftover))
                          return (
                            <div className="text-xs text-gray-500 mt-1">
                              Needs {needed} {comp.base}; package {packSz} {comp.base}; buy {comp.packageCount} • leftover ~{leftover} {comp.base}
                            </div>
                          )
                        } catch { return null }
                      })()}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${result.price.toFixed(2)}
                      </div>
                      {result.onSale && result.salePrice && (
                        <div className="text-sm text-red-600">
                          Sale: ${result.salePrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && !searchLoading && (
                  <p className="text-gray-500 text-center py-4">No alternatives found</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border shadow-sm p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {step === 'configure' ? '🔍 Finding Perfect Recipes' : '💰 Getting Real-Time Prices'}
            </h3>
            <p className="text-gray-600 mb-4">
              {step === 'configure' 
                ? 'Searching for culturally authentic recipes that match your preferences...' 
                : 'Fetching current Kroger prices for all ingredients...'}
            </p>
            <div className="text-sm text-gray-500">
              {step === 'configure' 
                ? 'This usually takes 10-15 seconds' 
                : 'This may take 20-30 seconds for accurate pricing'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple chip input for string arrays (inline component to avoid new files)
function ChipInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [text, setText] = useState('')

  const commit = () => {
    const tokens = text.split(',').map(s => s.trim()).filter(Boolean)
    if (!tokens.length) return
    const next = Array.from(new Set([...(value || []), ...tokens]))
    onChange(next)
    setText('')
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="border border-gray-300 rounded-md p-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {(value || []).map((item, idx) => (
            <span key={`${item}-${idx}`} className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
              {item}
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.preventDefault()
                  onChange((value || []).filter((x, i) => !(i === idx && x === item)))
                }}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
              e.preventDefault()
              commit()
            }
          }}
          onBlur={commit}
          placeholder={placeholder || 'Type and press Enter'}
          className="w-full p-2 outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {suggestions.slice(0,8).map((s) => (
            <button
              key={s}
              type="button"
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
              onClick={() => {
                if (!(value || []).includes(s)) onChange([...(value || []), s])
              }}
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}
