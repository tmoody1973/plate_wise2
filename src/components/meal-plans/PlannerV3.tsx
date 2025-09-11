'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpandableRowCard } from '@/components/ui/expandable-row-card';
import { RecipeRowHeader } from '@/components/meal-plans/RecipeRowCard';
import { RecipeDialog } from '@/components/meal-plans/RecipeDialog';
import { useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { recipeDatabaseService } from '@/lib/recipes/recipe-database-service';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Search, DollarSign, Clock, List as ListIcon, CheckCircle, Store, Plus, Minus, RotateCcw, Leaf, ChefHat, Globe, Gauge } from 'lucide-react';

type SlotType = 'breakfast' | 'lunch' | 'dinner';

interface PlanSlot {
  day: string; // ISO date or label
  type: SlotType;
  recipe?: any;
}

export default function PlannerV3() {
  const search = useSearchParams();
  const { user } = useAuthContext();
  const { profile } = useProfileSetup();
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [loadingMyRecipes, setLoadingMyRecipes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [culturalCuisines, setCulturalCuisines] = useState<string[]>(['mexican']);
  const [dishCategories, setDishCategories] = useState<string[]>(['main']);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsStatus, setSuggestionsStatus] = useState<string>('');
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  const [weeklyBudget, setWeeklyBudget] = useState<number>(75);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [targetDays, setTargetDays] = useState<number>(7);
  type AutoPlaceState = { active: boolean; indices: number[] };
  const [autoPlace, setAutoPlace] = useState<Record<SlotType, AutoPlaceState>>({
    breakfast: { active: false, indices: [] },
    lunch: { active: false, indices: [] },
    dinner: { active: false, indices: [] },
  });
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());
  const toggleExpanded = (idx: number) =>
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });

  // Mobile UI state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'suggestions' | 'library'>('suggestions');
  const [openDayIdx, setOpenDayIdx] = useState<number>(0);
  const [rightTab, setRightTab] = useState<'suggestions' | 'library'>('suggestions');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost'|'time'|'name'>('cost');
  const [openRecipe, setOpenRecipe] = useState<any | null>(null);
  const [openRecipeIndex, setOpenRecipeIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMealPlanId, setSavedMealPlanId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [altOpenKey, setAltOpenKey] = useState<string | null>(null);
  const [altLoadingKey, setAltLoadingKey] = useState<string | null>(null);
  const [altResults, setAltResults] = useState<Record<string, any[]>>({});
  const [pricingStreaming, setPricingStreaming] = useState(false);
  const [pricingLog, setPricingLog] = useState<Array<{ level: 'info'|'warn'|'error'; text: string }>>([]);
  const [explainKey, setExplainKey] = useState<string | null>(null);

  // Amount parsing helpers for the stepper
  const parseAmountNumber = (s: string | number | undefined): number => {
    if (s === undefined || s === null) return 0;
    const str = String(s).trim();
    if (!str) return 0;
    // Supports "1 1/2", "1/2", "2.25", "3"
    const m1 = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m1) {
      const a = parseFloat(m1[1]);
      const b = parseFloat(m1[2]);
      const c = parseFloat(m1[3]) || 1;
      return a + (b / c);
    }
    const m2 = str.match(/^(\d+)\/(\d+)$/);
    if (m2) {
      const b = parseFloat(m2[1]);
      const c = parseFloat(m2[2]) || 1;
      return b / c;
    }
    const m3 = str.match(/^(\d+(?:\.\d+)?)$/);
    if (m3) return parseFloat(m3[1]);
    const lm = str.match(/^(\d+(?:\.\d+)?)/);
    return lm ? parseFloat(lm[1]) : 0;
  };

  const stepAmount = async (slotIndex: number, ingIndex: number, ingredient: any, delta: number) => {
    const current = parseAmountNumber(ingredient?.amount ?? '0');
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    updateIngredientLocal(slotIndex, ingIndex, (g)=> ({ ...g, amount: String(next) }));
    await callUpdateIngredientApiIfDbBacked(ingredient, { amount: String(next) });
    await repriceIngredient(slotIndex, ingIndex, { ...ingredient, amount: String(next) });
  };
  // Refine bar state uses existing states for cultures/diet/categories
  const cultureOptions = ['mexican','hmong','haitian','japanese','chinese','indian','italian','greek','brazilian','thai','vietnamese','ethiopian'];
  const dietaryOptions = ['vegan','vegetarian','halal','kosher','gluten_free','dairy_free'];
  const categoryOptions: Array<{ value: string; label: string }> = [
    { value: 'main', label: 'Main' },
    { value: 'appetizer', label: 'Appetizers' },
    { value: 'side', label: 'Side Dishes' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'soup_stew', label: 'Soups & Stews' },
    { value: 'salad', label: 'Salad' },
    { value: 'drink', label: 'Drinks' },
  ];
  const [newCulture, setNewCulture] = useState('');
  const [refineOpen, setRefineOpen] = useState(false);
  // New compact refine bar controls
  const [maxPrepTime, setMaxPrepTime] = useState<string>('any');
  const [difficultyFilter, setDifficultyFilter] = useState<'any'|'easy'|'medium'|'hard'>('any');
  const [showAllCultures, setShowAllCultures] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Desktop: active day tab index (0-6)
  const [activeDay, setActiveDay] = useState<number>(0);

  const weekDays = useMemo(() => {
    // Always render Monday → Sunday for predictable order
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...
    // distance from Monday (1). Convert Sunday (0) to 6, Mon (1) to 0, ...
    const offsetToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offsetToMonday);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, []);

  const [plan, setPlan] = useState<PlanSlot[]>(() => {
    const slots: PlanSlot[] = [];
    const types: SlotType[] = ['breakfast', 'lunch', 'dinner'];
    for (const day of Array(7).fill(0).map((_, i) => i)) {
      for (const t of types) slots.push({ day: `D${day + 1}`, type: t });
    }
    return slots;
  });
  const normalizedTime = (r: any) => r?.metadata?.totalTime || r?.metadata?.totalTimeMinutes || r?.totalTimeMinutes || 0;
  const normalizedCost = (r: any) => r?.pricing?.totalCost || 0;
  const sortSuggestions = (list: any[]) => {
    const q = searchQuery.trim().toLowerCase();
    let out = list;
    if (q) out = out.filter(r => String(r.title||'').toLowerCase().includes(q));
    out = [...out].sort((a,b)=>{
      if (sortBy==='cost') return normalizedCost(a) - normalizedCost(b);
      if (sortBy==='time') return normalizedTime(a) - normalizedTime(b);
      return String(a.title||'').localeCompare(String(b.title||''));
    });
    return out;
  };

  const formatDayName = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString(undefined, { weekday: 'long' })
    } catch { return iso }
  };

  // Helpers to adjust ingredient status/substitution and recompute recipe totals
  const recalcRecipePricing = (recipe: any) => {
    try {
      const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      let total = 0;
      for (const ing of ings) {
        const status = (ing?.userStatus || ing?.user_status || 'normal');
        if (status === 'already-have') continue;
        const c = ing?.krogerPrice?.totalCost ?? ing?.kroger_price ?? 0;
        total += Number(c) || 0;
      }
      if (!recipe.pricing) recipe.pricing = {};
      recipe.pricing.totalCost = total;
      const servings = Number(recipe?.metadata?.servings || recipe.servings || 4) || 1;
      recipe.pricing.costPerServing = total / servings;
      return recipe;
    } catch { return recipe; }
  };

  const updateIngredientLocal = (slotIndex: number, ingIndex: number, updater: (ing: any) => any) => {
    setPlan(prev => prev.map((s, i) => {
      if (i !== slotIndex || !s.recipe) return s;
      const r = { ...s.recipe };
      r.ingredients = (r.ingredients || []).map((ing: any, j: number) => (j === ingIndex ? updater(ing) : ing));
      recalcRecipePricing(r);
      return { ...s, recipe: r };
    }));
  };

  const callUpdateIngredientApiIfDbBacked = async (ingredient: any, payload: any) => {
    const ingId = ingredient?.id || ingredient?.ingredientId;
    if (!ingId) return null; // in-memory ingredient
    try {
      const resp = await fetch(`/api/ingredients/${ingId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await resp.json();
    } catch { return null; }
  };

  const markAlreadyHave = async (slotIndex: number, ingIndex: number, ingredient: any) => {
    updateIngredientLocal(slotIndex, ingIndex, (ing) => ({ ...ing, userStatus: 'already-have' }));
    await callUpdateIngredientApiIfDbBacked(ingredient, { userStatus: 'already-have' });
  };

  const markSpecialtyStore = async (slotIndex: number, ingIndex: number, ingredient: any) => {
    const name = typeof window !== 'undefined' ? window.prompt('Which specialty store? (optional)', ingredient?.specialtyStore || '') : '';
    updateIngredientLocal(slotIndex, ingIndex, (ing) => ({ ...ing, userStatus: 'specialty-store', specialtyStore: name || undefined }));
    await callUpdateIngredientApiIfDbBacked(ingredient, { userStatus: 'specialty-store', specialtyStore: name || undefined });
  };

  const fetchAlternatives = async (slotIndex: number, ingIndex: number, ingredient: any) => {
    const key = `${slotIndex}:${ingIndex}`;
    try {
      setAltLoadingKey(key);
      setAltOpenKey(key);
      const name = ingredient?.name || ingredient?.item || '';
      const resp = await fetch('/api/pricing/alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, limit: 6, pricedOnly: true }),
      });
      const data = await resp.json();
      const list = data?.data?.topCandidates || [];
      setAltResults(prev => ({ ...prev, [key]: list }));
    } catch (e) {
      setAltResults(prev => ({ ...prev, [key]: [] }));
    } finally {
      setAltLoadingKey(null);
    }
  };

  const useAlternative = async (slotIndex: number, ingIndex: number, ingredient: any, alt: any) => {
    const sub = {
      productId: alt.productId,
      description: alt.description,
      name: alt.description,
      cleanName: alt.description,
      price: alt.price,
      unitPrice: alt.price,
      brand: alt.brand,
      size: alt.size,
      confidence: String(Math.round((alt.confidence || 0) * 100)) + '%',
      onSale: false,
    };
    // Update local
    updateIngredientLocal(slotIndex, ingIndex, (ing) => ({
      ...ing,
      name: sub.cleanName || ing.name,
      isSubstituted: true,
      krogerPrice: {
        ...(ing.krogerPrice || {}),
        unitPrice: sub.unitPrice,
        totalCost: sub.price,
        confidence: sub.confidence,
        productId: sub.productId,
        productName: sub.description,
        size: sub.size,
        brand: sub.brand,
      },
    }));
    await callUpdateIngredientApiIfDbBacked(ingredient, { krogerSubstitution: sub });
  };

  const repriceIngredient = async (slotIndex: number, ingIndex: number, ingredient: any) => {
    try {
      const name = ingredient?.name || '';
      const amt = ingredient?.amount ? String(ingredient.amount) : '1';
      const unit = ingredient?.unit ? String(ingredient.unit) : 'each';
      const zip = typeof window !== 'undefined' ? window.prompt('ZIP for pricing (optional, Enter to skip):', '') : '';
      const body: any = { ingredients: [{ name, amount: amt, unit }], servings: 4 };
      if (zip) body.zip = zip;
      const resp = await fetch('/api/pricing/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      const row = data?.data?.perIngredient?.[0];
      if (row) {
        updateIngredientLocal(slotIndex, ingIndex, (ing) => ({
          ...ing,
          krogerPrice: {
            ...(ing.krogerPrice || {}),
            unitPrice: Number(row.unitPrice || 0),
            totalCost: Number(row.estimatedCost || 0),
            productId: row?.product?.productId || ing?.krogerPrice?.productId,
            productName: row?.product?.description || ing?.krogerPrice?.productName,
            size: row?.packageSize || ing?.krogerPrice?.size,
            brand: row?.product?.brand || ing?.krogerPrice?.brand,
          }
        }));
      }
    } catch {}
  };
  const dayStyle = (idx: number) => {
    const palette = [
      { bg: 'bg-blue-50', bar: 'border-blue-200' },
      { bg: 'bg-emerald-50', bar: 'border-emerald-200' },
      { bg: 'bg-amber-50', bar: 'border-amber-200' },
      { bg: 'bg-violet-50', bar: 'border-violet-200' },
      { bg: 'bg-rose-50', bar: 'border-rose-200' },
      { bg: 'bg-cyan-50', bar: 'border-cyan-200' },
      { bg: 'bg-lime-50', bar: 'border-lime-200' },
    ];
    return palette[idx % palette.length];
  };

  // Apply/Reset/Rebuild helpers
  const updateUrlFromFilters = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('culturalCuisines', culturalCuisines.join(','));
      params.set('dishCategories', dishCategories.join(','));
      if (dietaryRestrictions.length) params.set('dietaryRestrictions', dietaryRestrictions.join(',')); else params.delete('dietaryRestrictions');
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', url);
    } catch {}
  };

  const applyFilters = async () => {
    updateUrlFromFilters();
    // Refresh suggestions based on new filters
    await fetchSuggestions();
    setRightTab('suggestions');
  };

  const resetFilters = async () => {
    setCulturalCuisines(['mexican']);
    setDishCategories(['main']);
    setDietaryRestrictions([]);
    setNewCulture('');
    setMaxPrepTime('any');
    setDifficultyFilter('any');
    await applyFilters();
  };

  const rebuildPlanFromFilters = async () => {
    if (!window.confirm('Replace meals in this plan using the current filters?')) return;
    // Clear current recipes
    setPlan(prev => prev.map(s => ({ ...s, recipe: undefined })));
    setSuggestionsLoading(true);
    const days = targetDays;
    const makeReq = async (mealType: SlotType, count: number) => fetch('/api/meal-plans/recipes-only', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ culturalCuisines, dishCategories, dietaryRestrictions, mealTypes: [mealType], mealCount: count, detailedInstructions: true })
    });
    try {
      const [dRes, lRes, bRes] = await Promise.all([
        makeReq('dinner', days),
        makeReq('lunch', days),
        makeReq('breakfast', days),
      ]);
      const dData = await dRes.json();
      const lData = await lRes.json();
      const bData = await bRes.json();
      if (dData?.success) autoFillForType('dinner', dData.data?.recipes || [], days);
      if (lData?.success) autoFillForType('lunch', lData.data?.recipes || [], days);
      if (bData?.success) autoFillForType('breakfast', bData.data?.recipes || [], days);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        setLoadingMyRecipes(true);
        const list = await recipeDatabaseService.getUserRecipes(user.id, true);
        setMyRecipes(list || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load My Recipes');
      } finally {
        setLoadingMyRecipes(false);
      }
    };
    load();
  }, [user?.id]);

  const addToSlot = (slotIndex: number, recipe: any) => {
    setPlan(prev => prev.map((s, i) => (i === slotIndex ? { ...s, recipe } : s)));
    setLastAddedIndex(slotIndex);
    setTimeout(() => setLastAddedIndex(null), 600);
  };

  const fetchSuggestions = async (slotType?: SlotType) => {
    try {
      setSuggestionsLoading(true);
      setError(null);
      const res = await fetch('/api/meal-plans/recipes-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          culturalCuisines,
          dishCategories,
          dietaryRestrictions,
          mealTypes: slotType ? [slotType] : ['dinner'],
          mealCount: 6,
        }),
      });
      const data = await res.json();
      if (data?.success) setSuggestions(data.data.recipes || []);
      else setError(data?.error || 'Failed to get suggestions');
    } catch (e: any) {
      setError(e?.message || 'Failed to get suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const pricePlan = async () => {
    try {
      setError(null);
      const selected = plan.filter(s => s.recipe).map(s => s.recipe);
      if (!selected.length) return;
      const res = await fetch('/api/meal-plans/add-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: selected, mode: 'package' }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Pricing failed');
      // Patch priced recipes back into plan by id
      const pricedById = new Map((data.data.recipes || []).map((r: any) => [r.id, r]));
      setPlan(prev => prev.map(s => (s.recipe && pricedById.has(s.recipe.id) ? { ...s, recipe: pricedById.get(s.recipe.id) } : s)));
    } catch (e: any) {
      setError(e?.message || 'Pricing failed');
    }
  };

  // Save current selection to DB as a meal plan with recipes
  const saveCurrentPlan = async () => {
    if (!user?.id) {
      setError('Please sign in to save your meal plan.');
      return;
    }
    try {
      setSaving(true);
      setSaveStatus('Creating meal plan…');
      setError(null);
      const name = `Weekly Plan – ${new Date().toLocaleDateString()}`;
      const created = await mealPlanService.createMealPlan(user.id, {
        name,
        description: 'Saved from Planner V3',
        culturalCuisines,
        dietaryRestrictions,
        budgetLimit: weeklyBudget,
        householdSize: 4,
        timeFrame: 'week',
      });
      setSavedMealPlanId(created.id);

      const selected = plan.filter(s => s.recipe).map(s => s.recipe);
      // Deduplicate by title + sourceUrl if present
      const seen = new Set<string>();
      const unique = selected.filter((r: any) => {
        const key = `${r.title || ''}__${r.sourceUrl || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Helper to normalize ingredients to DB shape
      const toIngredient = (ing: any) => {
        if (typeof ing === 'string') {
          return {
            name: ing,
            amount: '',
            unit: '',
            originalName: ing,
            isSubstituted: false,
            userStatus: 'normal' as const,
          };
        }
        return {
          name: ing?.name || ing?.item || '',
          amount: ing?.amount !== undefined && ing?.amount !== null ? String(ing.amount) : '',
          unit: ing?.unit ? String(ing.unit) : '',
          originalName: ing?.originalName || ing?.name || ing?.item || '',
          isSubstituted: !!ing?.isSubstituted,
          userStatus: (ing?.userStatus as any) || 'normal',
          krogerPrice: ing?.krogerPrice,
        };
      };

      let savedCount = 0;
      for (const r of unique) {
        setSaveStatus(`Saving recipes… (${savedCount + 1}/${unique.length})`);
        const data = {
          title: r.title,
          description: r.description || '',
          culturalOrigin: Array.isArray(r.culturalOrigin) && r.culturalOrigin.length ? r.culturalOrigin : [r.cuisine || 'international'],
          cuisine: r.cuisine || (r.culturalOrigin?.[0] || 'international'),
          sourceUrl: r.sourceUrl || r.metadata?.sourceUrl,
          imageUrl: r.imageUrl || r.image || r.metadata?.imageUrl,
          servings: Number(r?.metadata?.servings || r.servings || 4),
          prepTime: Number(r?.metadata?.prepTime || 10),
          cookTime: Number(r?.metadata?.cookTime || 20),
          totalTime: Number(r?.metadata?.totalTime || r?.metadata?.totalTimeMinutes || r.totalTimeMinutes || 30),
          difficulty: String(r?.metadata?.difficulty || 'medium'),
          instructions: Array.isArray(r.instructions) ? r.instructions.map((x: any) => (typeof x === 'string' ? x : (x?.description || x?.text || ''))) : [],
          tags: Array.isArray(r.tags) ? r.tags : [],
          ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(toIngredient) : [],
        } as const;
        await mealPlanService.addRecipeToMealPlan(created.id, data as any);
        savedCount++;
      }

      setSaveStatus(`Saved ${savedCount} recipes to your plan.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to save meal plan');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const generateShoppingList = async () => {
    if (!savedMealPlanId) {
      setError('Save your plan first to generate a shopping list.');
      return;
    }
    try {
      setSaveStatus('Generating shopping list…');
      const resp = await fetch(`/api/meal-plans/${savedMealPlanId}/shopping-list`, { method: 'POST' });
      const data = await resp.json();
      if (!data?.success) throw new Error(data?.error || 'Shopping list failed');
      setSaveStatus(`Shopping list ready with ${data?.shoppingList?.items?.length || 0} items.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate shopping list');
    } finally {
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  const priceSavedPlanStreaming = async () => {
    if (!savedMealPlanId) {
      setError('Save your plan first.');
      return;
    }
    const zip = typeof window !== 'undefined' ? window.prompt('Enter ZIP code for store pricing:', '90210') : '90210';
    if (!zip) return;
    setPricingLog([]);
    setPricingStreaming(true);
    try {
      const resp = await fetch(`/api/meal-plans/${savedMealPlanId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: zip }),
      });
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const block of parts) {
          const lines = block.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const safe = line.slice(5).trim();
              try {
                const evt = JSON.parse(safe);
                if (evt?.message) setPricingLog((prev)=> [...prev, { level: 'info', text: evt.message }]);
                if (evt?.error) setPricingLog((prev)=> [...prev, { level: 'error', text: String(evt.error) }]);
              } catch {}
            }
          }
        }
      }
    } catch (e: any) {
      setPricingLog((prev)=> [...prev, { level: 'error', text: e?.message || 'Streaming failed' }]);
    } finally {
      setPricingStreaming(false);
    }
  };

  const types: SlotType[] = ['breakfast', 'lunch', 'dinner'];

  // --- Budget helpers ---
  const planTotal = useMemo(() => {
    return plan.reduce((sum, s) => sum + (s.recipe?.pricing?.totalCost || 0), 0);
  }, [plan]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    plan.forEach(s => {
      const cost = s.recipe?.pricing?.totalCost || 0;
      map.set(s.day, (map.get(s.day) || 0) + cost);
    });
    return map;
  }, [plan]);

  // --- Streaming suggestions per slot ---
  const streamSuggestions = async (slotType?: SlotType) => {
    try {
      setSuggestions([]);
      setSuggestionsLoading(true);
      setSuggestionsStatus('Connecting…');
      const streamKey = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      setActiveStreamId(streamKey);

      const response = await fetch('/api/meal-plans/recipes-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          culturalCuisines,
          dishCategories,
          dietaryRestrictions,
          householdSize: 4,
          timeFrame: 'week',
          excludeIngredients: [],
          country: profile?.location?.country || undefined,
          language: (profile as any)?.language || undefined,
        })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line) continue;
          if (line.startsWith('data:')) {
            const safe = line.substring(5).trim();
            try {
              const data = JSON.parse(safe);
              // If a newer stream was started, ignore late events from older ones
              if (activeStreamId !== streamKey) continue;
              if (data.recipe) {
                setSuggestions(prev => [...prev, data.recipe]);
                received++;
                if (slotType) {
                  setAutoPlace(currMap => {
                    const curr = currMap[slotType];
                    if (!curr.active || curr.indices.length === 0) return currMap;
                    const [slotIdx, ...rest] = curr.indices;
                    let placed = false;
                    setPlan(prev => {
                      const exists = prev.some(s => s.recipe && (s.recipe.title === data.recipe.title || (s.recipe.sourceUrl && s.recipe.sourceUrl === data.recipe.sourceUrl)));
                      if (exists) return prev;
                      const next = [...prev];
                      if (next[slotIdx]) {
                        next[slotIdx] = { ...next[slotIdx], recipe: data.recipe } as any;
                        placed = true;
                      }
                      return next;
                    });
                    const nextMap = { ...currMap };
                    if (placed) {
                      setLastAddedIndex(slotIdx);
                      setTimeout(() => setLastAddedIndex(null), 600);
                      nextMap[slotType] = { active: rest.length > 0, indices: rest };
                    }
                    return nextMap;
                  });
                }
              } else if (data.message) {
                setSuggestionsStatus(data.message);
              }
            } catch {}
          }
        }
      }
      setSuggestionsStatus('');
      // Fallback: if streaming yielded nothing, do a quick non-stream search
      if (received === 0) {
        await fetchSuggestions(slotType);
      }
    } catch (e: any) {
      setSuggestionsStatus('');
      // Graceful fallback to non-streaming suggestions
      await fetchSuggestions(slotType);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const autoFillForType = (type: SlotType, recipesList: any[], daysCount: number) => {
    const toPlace = recipesList.slice(0, Math.min(daysCount, recipesList.length));
    const offset = type === 'breakfast' ? 0 : type === 'lunch' ? 1 : 2;
    setPlan(prev => {
      const next = [...prev];
      for (let d = 0; d < toPlace.length; d++) {
        const idx = d * 3 + offset;
        if (next[idx]) next[idx] = { ...next[idx], recipe: toPlace[d] } as any;
      }
      return next;
    });
    const remaining: number[] = [];
    for (let d = toPlace.length; d < daysCount; d++) remaining.push(d * 3 + offset);
    if (remaining.length > 0) {
      setAutoPlace(map => ({ ...map, [type]: { active: true, indices: remaining } }));
      setSheetTab('suggestions'); setSheetOpen(true);
      streamSuggestions(type);
    }
  };

  // Prefill settings from query params at first render
  useEffect(() => {
    try {
      const ccRaw = search.get('culturalCuisines');
      const catRaw = search.get('dishCategories');
      const hh = search.get('householdSize');
      const wb = search.get('weeklyBudget');
      const dietRaw = search.get('dietaryRestrictions');
      const open = search.get('openSheet');
      const days = parseInt(search.get('days') || '7') || 7;
      setTargetDays(days);
      const autofill = search.get('autofill') === '1';

      const ccParsed = ccRaw ? ccRaw.split(',').map(s=>s.trim()).filter(Boolean) : culturalCuisines;
      const catParsed = catRaw ? catRaw.split(',').map(s=>s.trim()).filter(Boolean) : dishCategories;
      const dietParsed = dietRaw ? dietRaw.split(',').map(s=>s.trim()).filter(Boolean) : dietaryRestrictions;

      if (ccRaw) setCulturalCuisines(ccParsed);
      if (catRaw) setDishCategories(catParsed);
      if (dietRaw) setDietaryRestrictions(dietParsed);
      if (hh) {
        const n = parseInt(hh); if (!Number.isNaN(n)) {/* household size used in downstream pricing only */}
      }
      if (wb) {
        const n = parseFloat(wb); if (!Number.isNaN(n)) setWeeklyBudget(n);
      }
      if (open === 'suggestions') { setSheetTab('suggestions'); setSheetOpen(true); streamSuggestions(); }
      if (autofill) {
        // Quick non-stream fetch and place top results into Dinner slots
        (async () => {
          setSuggestionsLoading(true);
          const makeReq = async (mealType: SlotType, count: number) => fetch('/api/meal-plans/recipes-only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              culturalCuisines: ccParsed,
              dishCategories: catParsed,
              dietaryRestrictions: dietParsed,
              mealTypes: [mealType],
              mealCount: count,
              detailedInstructions: true,
            })
          });
          const [dRes, lRes, bRes] = await Promise.all([
            makeReq('dinner', days),
            makeReq('lunch', days),
            makeReq('breakfast', days),
          ]);
          const dData = await dRes.json();
          const lData = await lRes.json();
          const bData = await bRes.json();
          if (dData?.success && Array.isArray(dData.data?.recipes)) autoFillForType('dinner', dData.data.recipes, days);
          if (lData?.success && Array.isArray(lData.data?.recipes)) autoFillForType('lunch', lData.data.recipes, days);
          if (bData?.success && Array.isArray(bData.data?.recipes)) autoFillForType('breakfast', bData.data.recipes, days);
          setSuggestionsLoading(false);
        })();
      }
    } catch {}
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-0 md:p-6 space-y-6">
      {/* Sticky header on mobile, inline on desktop */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur md:static md:bg-transparent md:backdrop-blur-0 border-b md:border-0 px-4 md:px-0 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Planner</h1>
            <div className="mt-2 w-full md:w-96 bg-gray-200 rounded h-3">
              <motion.div
                layout
                className={`h-3 rounded ${planTotal <= weeklyBudget ? 'bg-green-600' : 'bg-red-600'}`}
                style={{ width: `${Math.min(100, (planTotal / Math.max(1, weeklyBudget)) * 100)}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              />
            </div>
            <div className="text-sm md:text-base text-gray-800 mt-1 truncate font-medium">
              Total ${planTotal.toFixed(2)} / Budget ${weeklyBudget.toFixed(2)}
              {autoPlace.dinner.active && (
                <span className="text-xs text-purple-700 ml-2">Dinners: {targetDays - autoPlace.dinner.indices.length}/{targetDays}</span>
              )}
              {autoPlace.lunch.active && (
                <span className="text-xs text-emerald-700 ml-2">Lunch: {targetDays - autoPlace.lunch.indices.length}/{targetDays}</span>
              )}
              {autoPlace.breakfast.active && (
                <span className="text-xs text-blue-700 ml-2">Breakfast: {targetDays - autoPlace.breakfast.indices.length}/{targetDays}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 ml-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-700">Budget</span>
              <input type="number" className="w-24 p-1 border rounded" value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(parseFloat(e.target.value) || 0)} />
            </div>
            <button className="hidden md:inline px-4 py-2 bg-blue-600 text-white rounded" onClick={()=> setRefineOpen(o=>!o)}>{refineOpen ? 'Close Refine' : 'Refine Plan'}</button>
            <a className="hidden md:inline text-gray-600 hover:underline" href="/meal-plans">Classic</a>
            <button className="hidden md:inline px-4 py-2 bg-blue-600 text-white rounded" onClick={() => fetchSuggestions()}>Refresh</button>
            <button className="px-3 md:px-4 py-2 bg-green-600 text-white rounded" onClick={pricePlan}>Price</button>
            <button
              className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-60"
              onClick={saveCurrentPlan}
              disabled={saving}
            >{saving ? 'Saving…' : (savedMealPlanId ? 'Save Again' : 'Save Plan')}</button>
            <button
              className="px-3 md:px-4 py-2 bg-amber-600 text-white rounded disabled:opacity-60"
              onClick={generateShoppingList}
              disabled={!savedMealPlanId}
            >Shopping List</button>
            <button
              className="px-3 md:px-4 py-2 bg-teal-700 text-white rounded disabled:opacity-60"
              onClick={priceSavedPlanStreaming}
              disabled={!savedMealPlanId || pricingStreaming}
            >{pricingStreaming ? 'Pricing…' : 'Price Saved Plan (SSE)'}</button>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="hidden md:block bg-white border rounded-2xl shadow-sm p-4">
        <div className="text-lg font-semibold mb-1">How to use</div>
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Click “Get suggestions” under a day to see ideas. Tap “Add” to place a meal; “Swap” replaces it later.</li>
          <li>Click “Refine Plan” to change cuisines, dietary needs, or categories. Click “Apply Filters” to refresh ideas.</li>
          <li>Click “Rebuild Plan” if you want to refill the week from the filters. We’ll ask before replacing anything.</li>
          <li>Click “View” on a meal to see the full recipe. Click “Price” at the top when you’re ready to see your total.</li>
        </ol>
      </div>

      {/* Refine bar (desktop) */}
      {refineOpen && (
        <div className="hidden md:block bg-white border rounded-2xl shadow-sm p-3">
          <div className="flex items-center gap-3">
            {/* Filters laid out evenly */}
            <div className="flex-1 grid grid-cols-5 gap-3">
            {/* Dietary dropdown (single, like Prep Time) */}
            <div className="w-full bg-gray-50 border rounded-full px-4 py-2">
              <label className="sr-only">Dietary</label>
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-gray-400" />
                <select
                  value={dietaryRestrictions[0] ?? 'any'}
                  onChange={(e)=>{
                    const v = e.target.value;
                    setDietaryRestrictions(v === 'any' ? [] : [v]);
                  }}
                  className="w-full bg-transparent outline-none text-gray-800"
                >
                  <option value="any">Dietary</option>
                  {dietaryOptions.map(d => (
                    <option key={d} value={d}>{d.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Meal Type (Categories) */}
            <div className="w-full bg-gray-50 border rounded-full px-4 py-2">
              <label className="sr-only">Meal Type</label>
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-gray-400" />
                <select
                  value={dishCategories[0] || 'main'}
                  onChange={(e)=> setDishCategories([e.target.value])}
                  className="w-full bg-transparent outline-none text-gray-800"
                >
                  {categoryOptions.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add culture input */}
            <div className="w-full bg-gray-50 border rounded-full px-4 py-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <input
                  value={newCulture}
                  onChange={(e)=> setNewCulture(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter' && newCulture.trim()){ const v=newCulture.trim(); setCulturalCuisines(prev=> prev.includes(v)?prev:[...prev, v]); setNewCulture(''); } }}
                  placeholder="Add culture…"
                  className="w-full bg-transparent outline-none text-gray-600 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Prep Time */}
            <div className="w-full bg-gray-50 border rounded-full px-4 py-2">
              <label className="sr-only">Prep Time</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <select
                  value={maxPrepTime}
                  onChange={(e)=> setMaxPrepTime(e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-800"
                >
                  <option value="any">Prep Time</option>
                  <option value="15">Under 15 min</option>
                  <option value="30">Under 30 min</option>
                  <option value="45">Under 45 min</option>
                  <option value="60">Under 60 min</option>
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div className="w-full bg-gray-50 border rounded-full px-4 py-2">
              <label className="sr-only">Difficulty</label>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-gray-400" />
                <select
                  value={difficultyFilter}
                  onChange={(e)=> setDifficultyFilter(e.target.value as any)}
                  className="w-full bg-transparent outline-none text-gray-800"
                >
                  <option value="any">Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            </div>

            {/* Actions: right-aligned */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button onClick={resetFilters} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border text-gray-700">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button onClick={applyFilters} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-green-600 text-white">
                <Search className="w-4 h-4" /> Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>
      )}
      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-800 flex items-center justify-between">
          <span>{saveStatus}</span>
          {savedMealPlanId && (
            <span className="text-xs text-gray-600">Plan ID: {savedMealPlanId}</span>
          )}
        </div>
      )}
      {pricingLog.length > 0 && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded text-sm space-y-1">
          <div className="font-medium text-teal-800">Pricing progress</div>
          <div className="max-h-40 overflow-auto space-y-0.5">
            {pricingLog.map((l, i) => (
              <div key={i} className={l.level==='error'?'text-red-700': l.level==='warn'?'text-amber-700':'text-teal-800'}>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hidden md:grid grid-cols-12 gap-4">
        {/* Center: Day rows layout with horizontal tabs to avoid scroll */}
        <main className="col-span-8">
          <div className="bg-white border rounded-lg shadow-sm">
            {/* Day tabs */}
            <div className="p-3 border-b flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {weekDays.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => setActiveDay(i)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${i===activeDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    title={new Date(d).toLocaleDateString()}
                  >
                    {formatDayName(d)}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600">${(dayTotals.get(weekDays[activeDay]) || 0).toFixed(2)} / day</div>
            </div>
            {/* Selected day content */}
            <div className={`p-4 ${dayStyle(activeDay).bg}`}>
              <div className="space-y-3">
                {types.map((t, tIdx) => {
                  const dIdx = activeDay;
                  const idx = dIdx * 3 + tIdx;
                  const slot = plan[idx];
                  const r = slot?.recipe;
                  const isExpanded = expandedSlots.has(idx);
                  return (
                    <ExpandableRowCard
                      key={t}
                      isOpen={false}
                      onToggle={()=>{}}
                      header={ r ? (
                        <RecipeRowHeader
                          recipe={r}
                          onSwap={()=>{ setSheetTab('suggestions'); setSheetOpen(true); streamSuggestions(t) }}
                          onRemove={()=>{ addToSlot(idx, undefined as any) }}
                          onView={()=>{ setOpenRecipe(r); setOpenRecipeIndex(idx) }}
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium capitalize">{t}</div>
                          <div className="flex gap-2">
                            <button className="px-2 py-1 text-sm border rounded" onClick={() => { setSheetTab('suggestions'); setSheetOpen(true); streamSuggestions(t) }}>Add</button>
                            <button className="px-2 py-1 text-sm text-blue-700" onClick={() => { if (suggestions.length) addToSlot(idx, suggestions[0]); else { setAutoPlace(map=>({ ...map, [t]: { active: true, indices: [idx] } })); setSheetTab('suggestions'); setSheetOpen(true); streamSuggestions(t) } }}>🎲 Surprise me</button>
                          </div>
                        </div>
                      )}
                    >
                        {r && (
                          <div className="p-4">
                            <div className="space-y-2">
                              <div className="grid gap-3">
                                {r.ingredients?.slice(0, 8).map((ing: any, i: number) => {
                                    const slotKey = `${idx}:${i}`;
                                    const price = ing?.krogerPrice?.totalCost;
                                    return (
                                      <div key={i} className="p-2 bg-gray-50 rounded-xl border">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="font-medium text-gray-900 truncate text-sm">{ing?.name || ing}</div>
                                            <div className="text-[11px] text-gray-600 mt-0.5">
                                              {(ing?.amount ? String(ing.amount) : '')}{ing?.unit ? ` ${ing.unit}` : ''}
                                              {price !== undefined && Number.isFinite(price) ? ` • $${Number(price).toFixed(2)} total` : ''}
                                              {ing?.userStatus === 'already-have' ? ' • already have' : ''}
                                              {ing?.userStatus === 'specialty-store' ? ` • specialty store${ing?.specialtyStore ? `: ${ing.specialtyStore}` : ''}` : ''}
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-1 shrink-0">
                                            {ing?.krogerPrice && (
                                              <div className="text-right">
                                                <div className="text-green-700 font-bold text-sm">${Number(ing.krogerPrice.totalCost || 0).toFixed(2)}</div>
                                                {ing?.krogerPrice?.unitPrice && (
                                                  <div className="text-[11px] text-gray-600">${Number(ing.krogerPrice.unitPrice).toFixed(2)} per {(ing.krogerPrice as any).baseUnit || 'unit'}</div>
                                                )}
                                              </div>
                                            )}
                                            <div className="flex gap-2">
                                              <button className="px-3 py-1.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); fetchAlternatives(idx, i, ing); }}>
                                                <Search className="w-3 h-3" /> Find alternatives
                                              </button>
                                              <button className="px-3 py-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); markAlreadyHave(idx, i, ing); }}>
                                                <CheckCircle className="w-3 h-3" /> Already have
                                              </button>
                                              <button className="px-3 py-1.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); markSpecialtyStore(idx, i, ing); }}>
                                                <Store className="w-3 h-3" /> Specialty store
                                              </button>
                                              <button className="px-3 py-1.5 text-xs rounded-full bg-white text-gray-700 border inline-flex items-center gap-1" onClick={(e)=>{ e.stopPropagation(); setExplainKey(`${idx}:${i}`); }}>
                                                Explain price
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Inline amount/unit edit */}
                                        <div className="mt-2 flex items-center gap-2 text-[12px]">
                                          <div className="inline-flex items-center gap-1">
                                            <button className="p-1 rounded-full border bg-white text-gray-700" title="Decrease" onClick={(e)=>{ e.stopPropagation(); stepAmount(idx, i, ing, -0.25); }}>
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <input
                                              defaultValue={ing?.amount ?? ''}
                                              placeholder="amt"
                                              className="w-16 px-2 py-1 border rounded"
                                              onBlur={(e)=>{
                                                const v = e.currentTarget.value;
                                                if (String(ing?.amount||'') === v) return;
                                                updateIngredientLocal(idx, i, (g)=> ({ ...g, amount: v }));
                                                callUpdateIngredientApiIfDbBacked(ing, { amount: v }).then(()=> repriceIngredient(idx, i, { ...ing, amount: v }));
                                            }}
                                            />
                                            <button className="p-1 rounded-full border bg-white text-gray-700" title="Increase" onClick={(e)=>{ e.stopPropagation(); stepAmount(idx, i, ing, 0.25); }}>
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <input
                                            defaultValue={ing?.unit ?? ''}
                                            placeholder="unit"
                                            className="w-20 px-2 py-1 border rounded"
                                            onBlur={(e)=>{
                                              const v = e.currentTarget.value;
                                              if (String(ing?.unit||'') === v) return;
                                              updateIngredientLocal(idx, i, (g)=> ({ ...g, unit: v }));
                                              callUpdateIngredientApiIfDbBacked(ing, { unit: v }).then(()=> repriceIngredient(idx, i, { ...ing, unit: v }));
                                            }}
                                          />
                                          <button className="px-2 py-1 text-xs border rounded" onClick={(e)=>{ e.stopPropagation(); repriceIngredient(idx, i, ing); }}>Reprice</button>
                                        </div>
                                        {/* Alternatives drawer */}
                                        {altOpenKey === slotKey && (
                                          <div className="mt-2 p-2 bg-white border rounded">
                                            {altLoadingKey === slotKey && (
                                              <div className="text-[11px] text-gray-500">Searching…</div>
                                            )}
                                            <div className="grid grid-cols-1 gap-2">
                                              {(altResults[slotKey] || []).map((alt) => (
                                                <div key={alt.productId + alt.description} className="flex items-center justify-between">
                                                  <div className="min-w-0">
                                                    <div className="text-xs font-medium truncate">{alt.description}</div>
                                                    <div className="text-[11px] text-gray-600">${Number(alt.price || 0).toFixed(2)} • {alt.size || 'size n/a'}</div>
                                                  </div>
                                                  <button className="px-2 py-1 text-xs border rounded bg-blue-600 text-white" onClick={(e)=>{ e.stopPropagation(); useAlternative(idx, i, ing, alt); }}>
                                                    Use
                                                  </button>
                                                </div>
                                              ))}
                                              {Array.isArray(altResults[slotKey]) && altResults[slotKey].length === 0 && altLoadingKey !== slotKey && (
                                                <div className="text-[11px] text-gray-500">No alternatives found</div>
                                              )}
                                              <div className="text-right">
                                                <button className="text-[11px] text-gray-600" onClick={()=> setAltOpenKey(null)}>Close</button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {/* Explain price modal */}
                                        {explainKey === slotKey && (
                                          <div className="mt-2 p-2 bg-white border rounded text-[12px] text-gray-700">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="font-medium">Price breakdown</div>
                                              <button className="text-[11px]" onClick={()=> setExplainKey(null)}>Close</button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                              <div>Unit price</div>
                                              <div className="text-right">{ing?.krogerPrice?.unitPrice ? `$${Number(ing.krogerPrice.unitPrice).toFixed(2)}` : '—'}</div>
                                              <div>Package size</div>
                                              <div className="text-right">{ing?.krogerPrice?.packageSize || ing?.krogerPrice?.size || '—'}</div>
                                              <div>Packages</div>
                                              <div className="text-right">{ing?.krogerPrice?.packageCount ?? '—'}</div>
                                              <div>Required</div>
                                              <div className="text-right">{ing?.krogerPrice?.requiredAmount ?? (ing?.amount ? (ing?.unit ? `${ing.amount} ${ing.unit}` : `${ing.amount}`) : '—')}</div>
                                              <div>Leftover</div>
                                              <div className="text-right">{ing?.krogerPrice?.leftoverAmount ?? '—'}</div>
                                              <div>Total cost</div>
                                              <div className="text-right">{Number.isFinite(price) ? `$${Number(price).toFixed(2)}` : '—'}</div>
                                            </div>
                                            {ing?.krogerPrice?.storeLocation && (
                                              <div className="mt-1 text-[11px] text-gray-500">@ {ing.krogerPrice.storeLocation}</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                        )}
                      </ExpandableRowCard>
                    );
                  })}
                </div>
              </div>
            </div>
        </main>

        {/* Right: Suggestions | My Recipes tabs */}
        <aside className="col-span-4 bg-white border rounded-lg p-5 overflow-auto max-h-[80vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-4 text-sm">
              <button className={`pb-1 border-b-2 ${rightTab==='suggestions'?'border-purple-600 text-purple-700':'border-transparent text-gray-500'}`} onClick={()=>setRightTab('suggestions')}>Suggestions</button>
              <button className={`pb-1 border-b-2 ${rightTab==='library'?'border-purple-600 text-purple-700':'border-transparent text-gray-500'}`} onClick={()=>setRightTab('library')}>My Recipes</button>
            </div>
            {suggestionsLoading && <span className="text-xs text-gray-500">Loading…</span>}
          </div>
          {/* Search control (sorting pills removed by request) */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 border rounded-xl px-4 py-3 bg-gray-50">
              <Search className="w-5 h-5 text-gray-500" />
              <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="Search recipes…" className="w-full bg-transparent outline-none text-base" />
            </div>
          </div>
          {rightTab === 'suggestions' ? (
            <div>
              {suggestions.length === 0 && !suggestionsLoading && (
                <p className="text-sm text-gray-600">Click a row’s “Get suggestions” to see ideas here.</p>
              )}
              {suggestionsStatus && <div className="text-xs text-gray-600 mb-2">{suggestionsStatus}</div>}
              <div className="space-y-3">
                {sortSuggestions(suggestions).map((r) => (
                  <div key={r.id} className="border rounded-xl p-3 flex items-center justify-between hover:shadow transition" draggable onDragStart={(e)=>{try{e.dataTransfer.setData('text/plain', JSON.stringify(r));}catch{}}}>
                    <div className="flex items-center gap-3 min-w-0">
                      {r.imageUrl && (<img src={r.imageUrl} alt={r.title} className="w-14 h-14 object-cover rounded-lg" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />)}
                      <div className="min-w-0">
                        <div className="font-medium text-base line-clamp-1">{r.title}</div>
                        <div className="text-sm text-gray-600">{r.cuisine}</div>
                      </div>
                    </div>
                    <button className="text-blue-600 text-base" onClick={() => {
                      const emptyIdx = plan.findIndex(s => !s.recipe);
                      if (emptyIdx >= 0) addToSlot(emptyIdx, r)
                    }}>Add</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortSuggestions(myRecipes).map((r) => (
                <div key={r.id} className="border rounded-xl p-3 flex items-center justify-between hover:shadow transition">
                  <div className="flex items-center gap-3 min-w-0">
                    {(r.imageUrl || r?.metadata?.imageUrl) && (<img src={r.imageUrl || r.metadata?.imageUrl} alt={r.title} className="w-14 h-14 object-cover rounded-lg" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />)}
                    <div className="min-w-0">
                      <div className="font-medium text-base line-clamp-1">{r.title}</div>
                      <div className="text-sm text-gray-600">{r.cuisine}</div>
                    </div>
                  </div>
                  <button className="text-blue-600 text-base" onClick={() => {
                    const emptyIdx = plan.findIndex(s => !s.recipe);
                    if (emptyIdx >= 0) addToSlot(emptyIdx, r)
                  }}>Add</button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Mobile: Accordion days + Bottom Sheet */}
      <div className="md:hidden px-4">
        <div className="divide-y rounded-lg border bg-white">
          {weekDays.map((day, dIdx) => (
            <div key={day}>
              <button
                className="w-full flex items-center justify-between p-3"
                onClick={() => setOpenDayIdx(openDayIdx === dIdx ? -1 : dIdx)}
              >
                <div className="text-left">
                  <div className="font-medium">{day}</div>
                  <div className="text-xs text-gray-500">${(dayTotals.get(day) || 0).toFixed(2)} / day</div>
                </div>
                <span className="text-gray-500">{openDayIdx === dIdx ? '−' : '+'}</span>
              </button>
              <AnimatePresence initial={false}>
                {openDayIdx === dIdx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3"
                  >
                    {(['breakfast','lunch','dinner'] as SlotType[]).map((t, tIdx) => {
                      const idx = dIdx * 3 + tIdx;
                      const slot = plan[idx];
                      const r = slot?.recipe;
                      const glow = lastAddedIndex === idx ? 'ring-2 ring-purple-300' : '';
                      return (
                        <div key={t} className={`mt-2 p-3 border rounded-lg bg-gray-50 ${glow}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium capitalize">{t}</div>
                            {!r && (
                              <div className="flex gap-2">
                                <button className="px-2 py-1 text-xs border rounded" onClick={() => { setSheetTab('suggestions'); setSheetOpen(true); streamSuggestions(t); }}>Get suggestions</button>
                                <button className="px-2 py-1 text-xs border rounded" onClick={() => { setSheetTab('library'); setSheetOpen(true); }}>My recipes</button>
                              </div>
                            )}
                          </div>
                          {!r ? (
                            <div className="text-xs text-gray-600">Pick a suggestion or choose from your library.</div>
                          ) : (
                            <div>
                              <div className="font-medium text-sm line-clamp-2">{r.title}</div>
                              <div className="text-xs text-gray-500">{r.cuisine}</div>
                              <div className="flex gap-2 mt-1">
                                <button className="text-xs text-blue-600" onClick={() => { setSheetTab('suggestions'); setSheetOpen(true); streamSuggestions(t); }}>Swap</button>
                                <button className="text-xs text-gray-600" onClick={() => addToSlot(idx, undefined as any)}>Remove</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl border-t"
            style={{ height: '75vh' }}
          >
            <div className="p-3 border-b flex items-center justify-between">
              <div className="w-10 h-1.5 bg-gray-300 rounded mx-auto" />
              <button className="absolute right-3 top-2 text-gray-600" onClick={() => setSheetOpen(false)}>Close</button>
            </div>
            <div className="px-4">
              <div className="flex gap-4 mb-3">
                <button className={`pb-1 border-b-2 ${sheetTab==='suggestions'?'border-purple-600 text-purple-700':'border-transparent text-gray-500'}`} onClick={() => setSheetTab('suggestions')}>Suggestions</button>
                <button className={`pb-1 border-b-2 ${sheetTab==='library'?'border-purple-600 text-purple-700':'border-transparent text-gray-500'}`} onClick={() => setSheetTab('library')}>My Recipes</button>
              </div>
              <div className="overflow-auto" style={{ height: '64vh' }}>
                {sheetTab === 'suggestions' ? (
                  <div>
                    {suggestionsStatus && <div className="text-xs text-gray-600 mb-2">{suggestionsStatus}</div>}
                    <div className="space-y-2">
                      {suggestions.map((r) => (
                        <div key={r.id} className="border rounded p-2 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm line-clamp-1">{r.title}</div>
                            <div className="text-xs text-gray-500">{r.cuisine}</div>
                          </div>
                          <button className="text-blue-600 text-sm" onClick={() => {
                            const emptyIdx = plan.findIndex(s => !s.recipe);
                            if (emptyIdx >= 0) addToSlot(emptyIdx, r);
                          }}>Add</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myRecipes.map((r) => (
                      <div key={r.id} className="border rounded p-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm line-clamp-1">{r.title}</div>
                          <div className="text-xs text-gray-500">{r.cuisine}</div>
                        </div>
                        <button className="text-blue-600 text-sm" onClick={() => {
                          const emptyIdx = plan.findIndex(s => !s.recipe);
                          if (emptyIdx >= 0) addToSlot(emptyIdx, r);
                        }}>Add</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full recipe overlay */}
      {openRecipe && (
        <RecipeDialog
          recipe={openRecipe}
          onClose={() => { setOpenRecipe(null); setOpenRecipeIndex(null); }}
          onUpdate={(next) => {
            // Patch updated recipe back into plan
            if (openRecipeIndex !== null) {
              setPlan(prev => prev.map((s, i) => i === openRecipeIndex ? ({ ...s, recipe: next }) : s))
              setOpenRecipe(next)
            }
          }}
        />)
      }
    </div>
  );
}

// Prefill from URL parameters on first mount
// (Keep simple; only set once and let user adjust in UI)
// We place this after the component to keep code compact
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _prefillFromQuery(_ignored?: unknown) {}
