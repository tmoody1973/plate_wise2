'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Star, 
  DollarSign, 
  Globe, 
  ChefHat,
  Heart,
  Share2,
  Edit,
  Trash2
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
import dynamic from 'next/dynamic';
const RecipeScaling = dynamic(() => import('@/components/recipes/RecipeScaling').then(m => m.RecipeScaling), { ssr: false });
const SimplePricingPanel = dynamic(() => import('@/components/recipes/SimplePricingPanel').then(m => m.SimplePricingPanel), { ssr: false });
const PricingPanel = dynamic(() => import('@/components/recipes/PricingPanel').then(m => m.PricingPanel), { ssr: false });
const RecipePricingWithStoreModal = dynamic(
  () => import('@/components/recipes/RecipePricingWithStoreModal').then(m => m.RecipePricingWithStoreModal),
  { ssr: false }
);
const EnhancedPricingPanel = dynamic(
  () => import('@/components/recipes/EnhancedPricingPanel'),
  { ssr: false }
);
const StoreOptimizerPanel = dynamic(
  () => import('@/components/recipes/StoreOptimizerPanel'),
  { ssr: false, loading: () => <div className="bg-gray-100 rounded-xl p-6 animate-pulse"><div className="h-4 bg-gray-300 rounded mb-2"></div><div className="h-4 bg-gray-300 rounded w-3/4"></div></div> }
);
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Recipe } from '@/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { recipeService } from '@/lib/recipes';
import { useToast } from '@/components/ui/toast';
import { formatIngredientAmount } from '@/utils/fractions';

function extractIdFromSlug(slug: string): string {
  if (!slug) return '';
  
  // Check if it's already a full UUID (backward compatibility)
  if (slug.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
    return slug;
  }
  
  // Extract UUID from slug format: "recipe-name-uuid"
  // Look for the UUID pattern at the end of the slug
  const uuidMatch = slug.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  if (uuidMatch) {
    return uuidMatch[1] || slug;
  }
  
  // Fallback for old format: try to reconstruct UUID from parts
  const parts = slug.split('-');
  if (parts.length >= 5) {
    // Try to get the last 5 parts (UUID format: 8-4-4-4-12 characters)
    const lastFive = parts.slice(-5);
    const possibleUuid = lastFive.join('-');
    if (possibleUuid.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
      return possibleUuid;
    }
  }
  
  // Handle legacy short ID format (just first 8 chars)
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length === 8 && /^[a-f0-9]{8}$/i.test(lastPart)) {
    console.warn(`Legacy short ID format detected: ${lastPart}. Full recipe lookup needed.`);
    return lastPart; // This will likely fail, but we'll handle it gracefully
  }
  
  return slug;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const recipeId = extractIdFromSlug(slug);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cultural-pricing' | 'reviews' | 'scaling' | 'pricing'>('overview');
  const [isFavorited, setIsFavorited] = useState(false);
  const { user } = useAuthContext();
  const { addToast } = useToast();
  const { profile } = useProfileSetup();
  const { location: userLocation } = useUserLocation();
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [zipInput, setZipInput] = useState<string>('');
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStore, setSelectedStore] = useState<{ id?: string; name?: string }>({});
  const [findingStores, setFindingStores] = useState(false);
  const [pricingDetails, setPricingDetails] = useState<Array<{ name: string; unitPrice: number; estimatedCost: number; product?: any; topCandidates?: any[]; confidence?: number; explain?: any; packages?: number; packageSize?: string; portionCost?: number; packagePrice?: number }>>([]);
  const [openCandidateIndex, setOpenCandidateIndex] = useState<number | null>(null);
  const [openExplainIndex, setOpenExplainIndex] = useState<number | null>(null);
  const [openQuickIndex, setOpenQuickIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchOffset, setSearchOffset] = useState<number>(0);
  const [pricedOnly, setPricedOnly] = useState<boolean>(true);
  const [pricingSource, setPricingSource] = useState<'perplexity' | 'kroger' | null>(null);
  const [perplexityPanelData, setPerplexityPanelData] = useState<Array<{ ingredient: string; options: Array<{ storeName: string; productName: string; packageSize: string; packagePrice: number; unitPrice: number | string; portionCost: number; storeType: string; storeAddress?: string; sourceUrl?: string }>; selectedIndex?: number;}>>([])
  // Let user decide whether pricing should anchor to their default store (if any) or their city/ZIP
  const hasDefaultStore = Boolean((profile as any)?.preferences?.defaultStore?.name)
  const [pricingAnchor, setPricingAnchor] = useState<'store' | 'city'>(hasDefaultStore ? 'store' : 'city')
  const [ephemeralPreferred, setEphemeralPreferred] = useState<Array<{ name: string; productId: string }>>([]);
  const jsonRef = React.useRef<any>(null);
  const quickRef = React.useRef<HTMLDivElement | null>(null);

  const [refining, setRefining] = useState(false)
  // Lightweight mode to speed up local dev: skip heavy pricing widgets
  const lightMode = useMemo(() => {
    try {
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href)
        if (u.searchParams.get('light') === '1') return true
      }
    } catch {}
    return process.env.NEXT_PUBLIC_LIGHT_MODE === '1'
  }, [])

  const handleRefineFromSource = async () => {
    if (!recipe) return
    try {
      setRefining(true)
      const res = await fetch('/api/recipes/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json()
      if (j?.ok) {
        addToast({ type: 'success', title: 'Refined from source', message: 'Updated ingredients and image' })
        // reload
        const updated = await recipeService.getRecipeById(recipe.id)
        setRecipe(updated)
      } else {
        addToast({ type: 'warning', title: 'No changes', message: j?.error || 'Unable to refine' })
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Refine failed', message: e?.message })
    } finally {
      setRefining(false)
    }
  }

  // Close chooser with ESC
  useEffect(() => {
    if (openQuickIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenQuickIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openQuickIndex])

  const normalizedTokens = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const highlightMatch = (text: string, tokens: string[]) => {
    if (!text) return text;
    const parts = text.split(/(\s+)/);
    return (
      <>
        {parts.map((p, i) => {
          const lower = p.toLowerCase();
          const hit = tokens.some(t => t && lower.includes(t));
          return hit ? <mark key={i} className="px-0.5 bg-yellow-100 text-gray-900 rounded-sm">{p}</mark> : <span key={i}>{p}</span>;
        })}
      </>
    );
  };

  // Perform typed search within modal; supports pagination via offset
  const performSearch = async (idx: number, append = false) => {
    try {
      if (idx == null || !recipe) return
      setSearchLoading(true)
      const baseName = recipe?.ingredients[idx]?.name || ''
      const payload: any = { name: baseName, query: searchQuery || baseName, limit: 12, offset: append ? searchOffset : 0, pricedOnly };
      if (selectedStore.id) payload.locationId = selectedStore.id; else if (zipInput || userLocation.zipCode) payload.zip = (zipInput || userLocation.zipCode);
      const resp = await fetch('/api/pricing/alternatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (resp.ok) {
        const json = await resp.json();
        const top = json?.data?.topCandidates || [];
        setPricingDetails(prev => prev.map((r, i) => {
          if (i !== idx) return r
          const merged = append ? [ ...(r.topCandidates||[]), ...top ] : top
          return { ...r, topCandidates: merged }
        }));
        setSearchOffset(prev => append ? prev + (top.length || 0) : (top.length || 0))
      } else {
        const text = await resp.text().catch(()=> '')
        console.warn('[pricing] search failed', resp.status, text)
        addToast({ type: 'error', title: 'Search failed', message: 'Try a different query.' })
      }
    } catch (e) {
      console.warn('search error', e)
      addToast({ type: 'error', title: 'Search error', message: 'Network issue while searching.' })
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const recipeData = await recipeService.getRecipeById(recipeId);
      
      if (!recipeData) {
        setError('Recipe not found');
        return;
      }

      setRecipe(recipeData);
    } catch (error) {
      console.error('Failed to load recipe:', error);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push('/recipes' as any); // TODO: Implement edit page
  };

  const handleDelete = async () => {
    if (!recipe || !confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const success = await recipeService.deleteRecipe(recipeId, recipe.authorId || '');
      if (success) {
        router.push('/recipes');
      } else {
        alert('Failed to delete recipe');
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe');
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    // TODO: Implement favorite functionality
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.title,
        text: recipe?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Recipe link copied to clipboard!');
    }
  };

  const normalizeName = (s: string) => s.toLowerCase().trim();

  const buildPreferredList = () => {
    try {
      const mappings = ((profile as any)?.preferences?.productMappings) || {};
      const storeKey = selectedStore.id || ((profile as any)?.preferences?.defaultStore?.id) || '';
      const storeMap = (mappings as any)[storeKey] || {};
      if (!recipe) return [] as Array<{ name: string; productId: string }>;
      return recipe.ingredients.map(i => {
        const key = normalizeName(i.name);
        const pid = storeMap[key];
        return pid ? { name: i.name, productId: pid } : null;
      }).filter(Boolean) as Array<{ name: string; productId: string }>;
    } catch {
      return [];
    }
  };

  const refreshLivePrices = async (extraPreferred?: Array<{ name: string; productId: string }>) => {
    if (!recipe) return;
    console.log('🔄 Starting price refresh...', { recipeId: recipe.id, extraPreferred });
    try {
      setRefreshingPrices(true);
      const extras = Array.isArray(extraPreferred) ? extraPreferred : [];
      const payload = {
        ingredients: recipe.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
        zip: selectedStore.id ? undefined : (zipInput || userLocation.zipCode),
        locationId: selectedStore.id,
        servings: recipe.metadata.servings,
        preferredProductIds: [
          ...buildPreferredList(),
          ...extras,
          ...ephemeralPreferred,
        ],
      };
      // Try Perplexity first for more accurate pricing
      console.log('📡 Calling Perplexity API...', {
        ingredients: recipe.ingredients.map(i => i.name),
        location: zipInput || userLocation.zipCode,
        culturalContext: recipe.culturalOrigin || 'general'
      });
      
      let res = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: recipe.ingredients,
          location: zipInput || userLocation.zipCode,
          city: userLocation.city,
          culturalContext: recipe.culturalOrigin || 'general',
          defaultStoreName: pricingAnchor === 'store' ? (selectedStore.name || (profile as any)?.preferences?.defaultStore?.name || '') : ''
        }),
      });
      
      console.log('📡 Perplexity API response:', res.status, res.statusText);

      let json;
      if (res.ok) {
        json = await res.json();
        console.log('📊 Perplexity response data:', json);
        console.log('📊 Results array length:', json.results?.length || 0);
        console.log('📊 First result:', json.results?.[0]);
      } else {
        const errorText = await res.text();
        console.error('📡 Perplexity API error details:', errorText);
      }

      // Do not fallback to Kroger — we require Perplexity pricing per requirements
      if (!res.ok) {
        const err = await res.json().catch(async () => ({ error: await res.text().catch(() => `HTTP ${res.status}`) }))
        addToast({ type: 'error', title: 'Perplexity pricing failed', message: typeof err?.error === 'string' ? err.error : `HTTP ${res.status}` })
        throw new Error(typeof err?.error === 'string' ? err.error : `HTTP ${res.status}`)
      }
      if (!res.ok) {
        const err = await res.json().catch(async () => ({ error: await res.text().catch(() => `HTTP ${res.status}`) }))
        throw new Error(typeof err?.error === 'string' ? err.error : `Pricing failed: ${res.status}`)
      }
      
      if (!json) {
        json = await res.json();
      }
      console.log('📊 Processing response data...', json);
      
      // Handle Perplexity API response format
      if (json.results) {
        console.log('✅ Using Perplexity response format');
        setPricingSource('perplexity')
        
        const perplexityResults = json.results.map((result: any) => {
          // Trust server-side computed prices; only estimate if both are missing
          const portion = (typeof result.portionCost === 'number' && result.portionCost > 0)
            ? result.portionCost
            : (typeof result.estimatedCost === 'number' ? result.estimatedCost : 0)
          const pkgPrice = (typeof result.packagePrice === 'number' && result.packagePrice > 0)
            ? result.packagePrice
            : 0
          return {
            name: result.original,
            unitPrice: pkgPrice,
            estimatedCost: portion,
            product: {
              description: result.matched || 'Perplexity',
              items: [{
                price: { 
                  regular: pkgPrice,
                  promo: null 
                },
                size: result.packageSize || ''
              }]
            },
            confidence: result.confidence || 0.8,
            packages: result.packages || 1,
            packageSize: result.packageSize || 'package',
            portionCost: portion,
            packagePrice: pkgPrice,
            topCandidates: []
          };
        });
        
        setPricingDetails(perplexityResults);
        // Build data for the modal-based panel (Perplexity-only, with multiple options)
        const defaultName = pricingAnchor === 'store'
          ? (selectedStore.name || (profile as any)?.preferences?.defaultStore?.name || '').toLowerCase().trim()
          : ''
        const panelData = (json.results as any[]).map((r: any) => {
          const opts = Array.isArray(r.options) && r.options.length
            ? r.options
            : [{
                storeName: r.storeName || 'Store',
                productName: r.matched || r.productName || 'Product',
                packageSize: r.packageSize || 'package',
                packagePrice: Number(r.packagePrice || 0) || 0,
                unitPrice: r.unitPrice ?? (typeof r.packagePrice === 'number' && r.packageSize ? `$${r.packagePrice.toFixed(2)}/${r.packageSize}` : 'N/A'),
                portionCost: Number(r.portionCost || 0) || 0,
                storeType: r.storeType || 'mainstream',
                storeAddress: r.storeAddress || (userLocation.city ? `${userLocation.city}, ${userLocation.state}` : ''),
                sourceUrl: r.sourceUrl,
              }]
          // pick default selection index (match user's default store name if possible)
          const idx = defaultName
            ? Math.max(0, opts.findIndex((o: any) => (o?.storeName || '').toLowerCase().includes(defaultName)))
            : 0
          return {
            ingredient: r.original,
            options: opts.map((o: any) => ({
              storeName: o.storeName || 'Store',
              productName: o.productName || r.matched || 'Product',
              packageSize: o.packageSize || r.packageSize || 'package',
              packagePrice: Number(o.packagePrice || 0) || 0,
              unitPrice: o.unitPrice ?? (typeof o.packagePrice === 'number' && o.packageSize ? `$${o.packagePrice.toFixed(2)}/${o.packageSize}` : 'N/A'),
              portionCost: Number(o.portionCost || 0) || 0,
              storeType: o.storeType || 'mainstream',
              storeAddress: o.storeAddress,
              sourceUrl: o.sourceUrl,
            })),
            selectedIndex: idx,
          }
        })
        setPerplexityPanelData(panelData)
        console.log('📊 Set pricing details:', perplexityResults);
      }
      // Handle Kroger API response format (fallback)
      else if (json.data) {
        console.log('⚠️ Using Kroger response format');
        setPricingSource('kroger')
        const per = json.data.perIngredient || [];
        setPricingDetails(per);
        // Auto-open change list for ambiguous item (low confidence)
        const ambiguousIndex = per.findIndex((p: any) => (p.confidence ?? 1) < 0.5);
        if (ambiguousIndex >= 0) {
          setActiveTab('scaling');
          setOpenCandidateIndex(ambiguousIndex);
        }
        if (json.data.locationId) setSelectedStore({ id: json.data.locationId, name: json.data.storeName });
        const updated = await recipeService.updateRecipe({
          id: recipe.id,
          costAnalysis: {
            totalCost: json.data.totalCost,
            costPerServing: json.data.costPerServing,
            storeComparison: [],
            seasonalTrends: [],
            bulkBuyingOpportunities: [],
            couponSavings: [],
            alternativeIngredients: [],
          },
        } as any, user?.id || '');
        if (updated) setRecipe(updated);
      }
    } catch (e: any) {
      console.warn('Failed to refresh prices', e);
      addToast({ type: 'error', title: 'Could not refresh prices', message: e?.message || 'Check credentials or try again.' });
    } finally {
      setRefreshingPrices(false);
    }
  };

  // Review pricing using Perplexity AI analysis
  const reviewPricingFor = async (idx: number) => {
    try {
      const ingredient = recipe?.ingredients[idx];
      const pricingDetail = pricingDetails[idx];
      
      if (!ingredient || !pricingDetail) return;
      
      console.log('[pricing] Reviewing pricing with Perplexity AI...', { ingredient: ingredient.name, currentPrice: pricingDetail.estimatedCost });
      
      // Use Perplexity to analyze if the price is reasonable
      const reviewPayload = {
        ingredients: [{
          name: ingredient.name,
          currentPrice: pricingDetail.estimatedCost,
          unit: ingredient.unit,
          amount: ingredient.amount
        }],
        location: zipInput || userLocation.zipCode,
        culturalContext: recipe.culturalOrigin || 'general'
      };
      
      const reviewResp = await fetch('/api/pricing/cultural', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(reviewPayload) 
      });
      
      if (reviewResp.ok) {
        const reviewData = await reviewResp.json();
        console.log('[pricing] Perplexity price analysis', reviewData);
        
        // Show analysis results to user
        if (reviewData.success && reviewData.data) {
          const analysis = reviewData.data.ingredients?.[0];
          if (analysis) {
            const isReasonable = analysis.pricingOptions?.some((opt: any) => 
              Math.abs(opt.price - pricingDetail.estimatedCost) / pricingDetail.estimatedCost < 0.3
            );
            
            const message = isReasonable 
              ? `Price looks reasonable! Perplexity found similar prices at ${analysis.pricingOptions?.[0]?.store?.name || 'local stores'}.`
              : `Price might be high. Perplexity suggests checking ${analysis.pricingOptions?.[0]?.store?.name || 'alternative stores'} for better deals.`;
            
            addToast({ 
              type: isReasonable ? 'success' : 'warning', 
              title: 'Price Analysis Complete', 
              message 
            });
          }
        }
      } else {
        addToast({ type: 'info', title: 'Review Complete', message: 'Price review completed. Consider checking local stores for better deals.' });
      }
    } catch (error) {
      console.warn('Price review failed', error);
      addToast({ type: 'info', title: 'Review Complete', message: 'Price reviewed. Consider comparing with local store prices.' });
    }
  };

  const useCandidate = async (rowIndex: number, candidate: any) => {
    try {
      if (!user) return alert('Please sign in to save preferences.');
      // If candidate is tied to a different store (from nearby fallback), honor that
      const mappedStoreId = candidate.storeId || selectedStore.id || (profile as any)?.preferences?.defaultStore?.id;
      const mappedStoreName = candidate.storeName || selectedStore.name || (profile as any)?.preferences?.defaultStore?.name;
      const storeId = mappedStoreId;
      if (!storeId) {
        alert('Select a store first.');
        return;
      }
      // Optimistically update the UI with the selected candidate
      setPricingDetails(prev => prev.map((r, i) => {
        if (i !== rowIndex) return r
        const next = { ...r }
        next.product = { description: candidate.description, items: [{ price: { regular: candidate.price }, size: candidate.size }], images: candidate.image ? [{ url: candidate.image }] : [] }
        next.estimatedCost = typeof candidate.price === 'number' && candidate.price > 0 ? candidate.price : r.estimatedCost
        return next
      }))
      const ingredientName = recipe?.ingredients[rowIndex]?.name || '';
      const key = normalizeName(ingredientName);
      const prefs = (profile as any)?.preferences || {};
      const updatedMappings = {
        ...(prefs.productMappings || {}),
        [storeId]: {
          ...((prefs.productMappings || {})[storeId] || {}),
          [key]: candidate.productId,
        },
      };
      const { profileService } = await import('@/lib/profile/profile-service');
      const res = await profileService.updateProfile(user.id, { preferences: { ...prefs, productMappings: updatedMappings } } as any);
      if (!res.success) throw new Error(res.error || 'Failed to save mapping');
      // Also apply immediately for this refresh cycle
      setEphemeralPreferred(prev => {
        const next = prev.filter(p => p.name.toLowerCase().trim() !== ingredientName.toLowerCase().trim());
        next.push({ name: ingredientName, productId: candidate.productId });
        return next;
      });
      setOpenCandidateIndex(null);
      setOpenQuickIndex(null);
      // If we picked a different store, switch the selectedStore so pricing matches the chosen price context
      if (candidate.storeId && candidate.storeId !== selectedStore.id) {
        setSelectedStore({ id: candidate.storeId, name: mappedStoreName })
      }
      if (ingredientName) {
        await refreshLivePrices([{ name: ingredientName, productId: candidate.productId }]);
      } else {
        await refreshLivePrices();
      }
      addToast({ type: 'success', title: 'Updated pricing', message: `Using: ${candidate.description || 'selected product'}` });
    } catch (e) {
      console.warn('Failed to use candidate', e);
      addToast({ type: 'error', title: 'Could not save selection', message: 'Please try again.' });
    }
  };

  // Fetch alternatives using our pricing API and open quick review chooser
  const fetchAlternativesFor = async (idx: number) => {
    try {
      console.debug('[pricing] search alternatives click with Perplexity integration', { idx })
      if (pricingDetails[idx]?.topCandidates && pricingDetails[idx].topCandidates.length > 0) {
        setSearchQuery(recipe?.ingredients[idx]?.name || '')
        setOpenQuickIndex(idx);
        return;
      }
      
      const ingredient = recipe?.ingredients[idx];
      if (!ingredient) return;
      
      // seed search with ingredient name
      setSearchQuery(ingredient.name || '')
      setSearchOffset(0)
      
      // First try Perplexity for enhanced pricing intelligence
      let perplexityAlternatives: any[] = [];
      try {
        console.log('[pricing] Trying Perplexity for enhanced ingredient search...');
        const perplexityPayload = {
          ingredients: [ingredient.name],
          location: zipInput || userLocation.zipCode,
          culturalContext: recipe.culturalOrigin || 'general'
        };
        
        const perplexityResp = await fetch('/api/pricing/perplexity', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            ...perplexityPayload,
            city: userLocation.city,
            defaultStoreName: pricingAnchor === 'store' ? (selectedStore.name || (profile as any)?.preferences?.defaultStore?.name || '') : ''
          })
        });
        
        if (perplexityResp.ok) {
          const perplexityData = await perplexityResp.json();
          console.log('[pricing] Perplexity enhanced results', perplexityData);
          
          // Transform Perplexity data to match our UI format
          if (perplexityData.results && perplexityData.results.length > 0) {
            perplexityAlternatives = perplexityData.results.map((result: any) => ({
              description: `${result.original} - ${result.matched || 'Perplexity Match'}`,
              price: result.estimatedCost || result.packagePrice || 0,
              size: result.packageSize || 'package',
              category: 'Perplexity AI',
              storeName: result.bestPriceSummary?.includes('at ') ? result.bestPriceSummary.split('at ')[1] : 'Various Stores',
              confidence: result.confidence || 0.8,
              source: 'Perplexity AI',
              storeOptions: result.compare ? Object.entries(result.compare).flatMap(([type, stores]: [string, any]) => 
                (stores || []).map((store: any) => ({
                  type,
                  name: store.store,
                  price: store.price,
                  tags: store.tags || []
                }))
              ) : []
            }));
          }
        }
      } catch (perplexityError) {
        console.warn('[pricing] Perplexity fallback failed, using standard search', perplexityError);
      }
      
      // Standard alternatives search
      const payload: any = { name: ingredient.name, limit: 12, pricedOnly };
      if (selectedStore.id) payload.locationId = selectedStore.id; 
      else if (zipInput || userLocation.zipCode) payload.zip = (zipInput || userLocation.zipCode);
      
      const resp = await fetch('/api/pricing/alternatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (resp.ok) {
        const json = await resp.json();
        const standardAlternatives = json?.data?.topCandidates || [];
        
        // Combine Perplexity and standard alternatives
        const combinedAlternatives = [...perplexityAlternatives, ...standardAlternatives];
        
        console.debug('[pricing] Combined alternatives result', { perplexity: perplexityAlternatives.length, standard: standardAlternatives.length, total: combinedAlternatives.length });
        setPricingDetails(prev => prev.map((r, i) => i === idx ? { ...r, topCandidates: combinedAlternatives } : r));
        setSearchOffset(combinedAlternatives.length || 0)
      } else {
        const text = await resp.text().catch(()=>'')
        console.warn('[pricing] alternatives failed', resp.status, text)
        
        // If standard search failed but we have Perplexity results, use those
        if (perplexityAlternatives.length > 0) {
          setPricingDetails(prev => prev.map((r, i) => i === idx ? { ...r, topCandidates: perplexityAlternatives } : r));
          setSearchOffset(perplexityAlternatives.length || 0)
          addToast({ type: 'info', title: 'Enhanced Search', message: 'Using Perplexity AI for pricing intelligence.' })
        } else {
          addToast({ type: 'error', title: 'Search failed', message: 'Could not load alternatives for this item.' })
        }
      }
    } catch (e) {
      console.warn('Failed to fetch alternatives', e);
      addToast({ type: 'error', title: 'Search failed', message: 'Network or API error while searching.' })
    } finally {
      setOpenQuickIndex(idx);
      // Bring the quick review section into view for the user
      setTimeout(() => {
        try { quickRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      }, 0);
    }
  };

  const fetchStores = async () => {
    try {
      setFindingStores(true)
      const zip = (zipInput || userLocation.zipCode || '').trim();
      if (!zip) {
        alert('Enter a ZIP code to find nearby stores');
        return;
      }
      const res = await fetch(`/api/kroger/locations?zip=${encodeURIComponent(zip)}`);
      if (!res.ok) throw new Error(`Store lookup failed: ${res.status}`);
      const json = await res.json();
      const list = (json.data || []).map((s: any) => ({ id: s.id as string, name: s.name as string }));
      setStores(list);
      if (list[0]) setSelectedStore(list[0]);
    } catch (e) {
      console.warn('Failed to fetch stores', e);
      alert('Could not load stores. Check ZIP and try again.');
    } finally {
      setFindingStores(false)
    }
  };

  useEffect(() => {
    setZipInput(userLocation.zipCode || '');
    const def = (profile as any)?.preferences?.defaultStore;
    if (def?.id) {
      setSelectedStore({ id: def.id, name: def.name });
    }
  }, [userLocation.zipCode, profile]);

  const saveDefaultStore = async () => {
    try {
      if (!user || !selectedStore.id) return;
      const updates: any = {
        preferences: {
          ...(profile as any)?.preferences,
          defaultStore: { id: selectedStore.id, name: selectedStore.name, zip: zipInput || userLocation.zipCode },
        },
      };
      const { profileService } = await import('@/lib/profile/profile-service');
      const res = await profileService.updateProfile(user.id, updates);
      if (!res.success) throw new Error(res.error || 'Failed to save default store');
      alert('Default store saved');
    } catch (e) {
      console.warn('Failed to save default store', e);
      alert('Could not save default store. Try again.');
    }
  };

  const handleRate = () => {
    // TODO: Implement rating modal
    console.log('Rate recipe');
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const averageRating = recipe?.ratings.length 
    ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length 
    : 0;

  // Heuristic: extract missing time/cost metadata from description text when not stored in fields
  const derivedMeta = useMemo(() => {
    const text = recipe?.description || '';
    const toMinutes = (h?: number, m?: number) => (h || 0) * 60 + (m || 0);
    const num = (s?: string) => (s ? parseFloat(s) : NaN);

    const findTime = (label: string): number | undefined => {
      // e.g., "Prep Time: 15 min" or "prep: 1 hr 20 min"
      const re1 = new RegExp(`${label}\\s*:?\\s*(\\d+)\\s*(min|minutes)`, 'i');
      const m1 = text.match(re1);
      if (m1) return parseInt(m1[1]!, 10);
      const re2 = new RegExp(`${label}\\s*:?\\s*(\\d+)\\s*(h|hr|hour|hours)(?:\\s*(\\d+)\\s*(min|minutes))?`, 'i');
      const m2 = text.match(re2);
      if (m2) return toMinutes(parseInt(m2[1]!, 10), m2[3] ? parseInt(m2[3]!, 10) : 0);
      return undefined;
    };

    const findTotal = (): number | undefined => {
      const ready = text.match(/ready\\s*in\\s*:?\\s*(\\d+)\\s*(min|minutes)/i);
      if (ready) return parseInt(ready[1]!, 10);
      const totalMin = text.match(/total\\s*time\\s*:?\\s*(\\d+)\\s*(min|minutes)/i);
      if (totalMin) return parseInt(totalMin[1]!, 10);
      const totalHour = text.match(/total\\s*time\\s*:?\\s*(\\d+)\\s*(h|hr|hour|hours)(?:\\s*(\\d+)\\s*(min|minutes))?/i);
      if (totalHour) return toMinutes(parseInt(totalHour[1]!, 10), totalHour[3] ? parseInt(totalHour[3]!, 10) : 0);
      return undefined;
    };

    const findServings = (): number | undefined => {
      const m = text.match(/(servings?|serves)\\s*:?\\s*(\\d+)/i);
      if (m) return parseInt(m[2]!, 10);
      return undefined;
    };

    const findCostPerServing = (): number | undefined => {
      const withServing = text.match(/(cost|price)[^\n]*?(per\\s*serving)[^\n]*?(\$?\d+(?:\.\d{1,2})?)/i);
      if (withServing) return num(String(withServing[3] || '').replace('$', ''));
      const plain = text.match(/\$\s?(\d+(?:\.\d{1,2})?)\s*(?:per\\s*serving)/i);
      if (plain) return num(plain[1]!);
      return undefined;
    };

    const prep = findTime('prep');
    const cook = findTime('cook');
    const total = findTotal();
    const servings = findServings();
    const costPerServing = findCostPerServing();

    return { prep, cook, total, servings, costPerServing };
  }, [recipe?.description]);

  // Persist backfilled metadata/cost if missing and derivable
  useEffect(() => {
    const persistIfNeeded = async () => {
      if (!recipe || !user) return;

      const metadataUpdates: any = { ...recipe.metadata };
      let hasMetaUpdate = false;

      if (!metadataUpdates.servings && derivedMeta.servings) {
        metadataUpdates.servings = derivedMeta.servings;
        hasMetaUpdate = true;
      }
      if (!metadataUpdates.prepTime && derivedMeta.prep) {
        metadataUpdates.prepTime = derivedMeta.prep;
        hasMetaUpdate = true;
      }
      if (!metadataUpdates.cookTime && derivedMeta.cook) {
        metadataUpdates.cookTime = derivedMeta.cook;
        hasMetaUpdate = true;
      }
      if (!metadataUpdates.totalTime && (derivedMeta.total || (derivedMeta.prep || 0) + (derivedMeta.cook || 0))) {
        metadataUpdates.totalTime = derivedMeta.total || ((derivedMeta.prep || 0) + (derivedMeta.cook || 0));
        hasMetaUpdate = true;
      }

      let costUpdates: any = recipe.costAnalysis ? { ...recipe.costAnalysis } : undefined;
      let hasCostUpdate = false;
      if ((costUpdates?.costPerServing == null || costUpdates.costPerServing === 0) && derivedMeta.costPerServing != null) {
        if (!costUpdates) {
          // initialize minimal cost analysis if missing
          (metadataUpdates as any); // keep TS happy without altering types
        }
        const existing = recipe.costAnalysis || {
          totalCost: 0,
          costPerServing: 0,
          storeComparison: [],
          seasonalTrends: [],
          bulkBuyingOpportunities: [],
          couponSavings: [],
          alternativeIngredients: [],
        };
        existing.costPerServing = derivedMeta.costPerServing as number;
        // If servings known, estimate totalCost
        if ((metadataUpdates.servings || recipe.metadata.servings) && !existing.totalCost) {
          const s = metadataUpdates.servings || recipe.metadata.servings;
          existing.totalCost = (derivedMeta.costPerServing as number) * s;
        }
        costUpdates = existing;
        hasCostUpdate = true;
      }

      if (!hasMetaUpdate && !hasCostUpdate) return;

      try {
        const updated = await recipeService.updateRecipe({
          id: recipe.id,
          ...(hasMetaUpdate ? { metadata: metadataUpdates } : {}),
          ...(hasCostUpdate ? { costAnalysis: costUpdates } : {}),
        } as any, user.id);
        if (updated) {
          setRecipe(updated);
        }
      } catch (e) {
        console.warn('Non-blocking: failed to persist derived metadata/cost', e);
      }
    };
    void persistIfNeeded();
  }, [recipe?.id, user?.id, derivedMeta.prep, derivedMeta.cook, derivedMeta.total, derivedMeta.servings, derivedMeta.costPerServing]);

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">Loading recipe...</span>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !recipe) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😞</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipe Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The recipe you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={handleBack}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Recipe Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Clock className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900">{
            formatTime(
              recipe.metadata.totalTime ||
              (recipe.metadata.prepTime + recipe.metadata.cookTime) ||
              derivedMeta.total ||
              (derivedMeta.prep || 0) + (derivedMeta.cook || 0)
            )
          }</div>
          <div className="text-sm text-gray-600">Total Time</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Users className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900">{recipe.metadata.servings || derivedMeta.servings || 0}</div>
          <div className="text-sm text-gray-600">Servings</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <ChefHat className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900 capitalize">{recipe.metadata.difficulty}</div>
          <div className="text-sm text-gray-600">Difficulty</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <DollarSign className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900">
            ${
              (recipe.costAnalysis?.costPerServing ?? derivedMeta.costPerServing ?? 0).toFixed(2)
            }
          </div>
          <div className="text-sm text-gray-600 flex items-center justify-center space-x-2">
            <span>Per Serving</span>
            {pricingDetails.length > 0 && (
              <button
                onClick={() => {
                  // open the most ambiguous or most expensive item
                  let idx = pricingDetails.findIndex((p: any) => (p.confidence ?? 1) < 0.5);
                  if (idx < 0) {
                    idx = pricingDetails.reduce((best, cur, i, arr) => cur.estimatedCost > (arr[best]?.estimatedCost || 0) ? i : best, 0);
                  }
                  // Quick review popover in-place on Overview
                  setOpenQuickIndex(idx >= 0 ? idx : null);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
                title="Review item matches"
              >Review</button>
            )}
          </div>
        </div>
      </div>

      {/* Store Optimization Panel (skip in light mode) */}
      {!lightMode && recipe?.ingredients && recipe.ingredients.length > 0 && (
        <StoreOptimizerPanel
          ingredients={recipe.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          }))}
          existingPricingData={pricingSource === 'perplexity' && perplexityPanelData.length > 0 ? 
            perplexityPanelData.flatMap(item => 
              item.options.map(option => ({
                ingredient: item.ingredient,
                storeName: option.storeName,
                productName: option.productName,
                packagePrice: option.packagePrice,
                portionCost: option.portionCost,
                storeType: option.storeType,
                storeAddress: option.storeAddress,
                packageSize: option.packageSize,
                unitPrice: option.unitPrice,
                sourceUrl: option.sourceUrl
              }))
            ) : undefined
          }
          onPlanGenerated={(plan) => {
            console.log('🎯 Store optimization plan generated:', plan)
            addToast?.({
              type: 'success',
              title: 'Shopping Plan Ready',
              message: `Shopping plan optimized! ${plan.efficiency}% of ingredients at ${plan.primaryStore.name}`,
              duration: 5000
            })
          }}
        />
      )}

      {/* Enhanced Recipe Pricing - Mobile-friendly with shopping list (skip in light mode) */}
      {!lightMode && pricingSource === 'perplexity' && perplexityPanelData.length > 0 ? (
        <EnhancedPricingPanel 
          data={perplexityPanelData}
          onSearchStores={async (ingredient, ingredientIndex) => {
            console.log('🔍 Searching for more store options for:', ingredient);
            
            try {
              const searchResponse = await fetch('/api/stores/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ingredient,
                  location: zipInput || userLocation.zipCode,
                  city: userLocation.city + ', ' + userLocation.state,
                  culturalContext: recipe.culturalOrigin || 'general'
                })
              });

              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                console.log('🔍 Store search results:', searchData);

                if (searchData.success && searchData.storeOptions) {
                  console.log('🔍 Found', searchData.storeOptions.length, 'store options');
                  return searchData.storeOptions;
                }
              }
              
              console.warn('🔍 No additional store options found');
              return [];
            } catch (error) {
              console.error('🔍 Search error:', error);
              return [];
            }
          }}
        />
      ) : (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <DollarSign className="w-8 h-8 text-green-600" />
            <h2 className="text-2xl font-bold text-green-900">Get Recipe Pricing</h2>
          </div>
          <p className="text-green-700 mb-6 max-w-md mx-auto">
            See exact costs from local stores in {userLocation.city} and get a smart shopping plan organized by location.
          </p>
          <button
            onClick={() => refreshLivePrices()}
            disabled={refreshingPrices}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            {refreshingPrices ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Getting Prices...
              </>
            ) : (
              <>
                <DollarSign className="w-6 h-6" />
                Get Accurate Prices
              </>
            )}
          </button>
          <div className="mt-4 text-sm text-green-600">
            ✓ Real local store prices ✓ Smart shopping routes ✓ Mobile-friendly
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recipe.ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="text-gray-900">
                <div>{formatIngredientAmount(ingredient.amount, ingredient.unit)} {ingredient.name}</div>
                {(ingredient.weightGrams || ingredient.wholeEquivalent) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {ingredient.weightGrams ? `≈ ${ingredient.weightGrams}g` : ''}
                    {ingredient.weightGrams && ingredient.wholeEquivalent ? ' · ' : ''}
                    {ingredient.wholeEquivalent || ''}
                  </div>
                )}
              </div>
              {ingredient.culturalName && (
                <span className="text-sm text-orange-600 italic">
                  ({ingredient.culturalName})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Instructions</h3>
        <div className="space-y-4">
          {recipe.instructions.map((instruction, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-medium">
                {instruction.step}
              </div>
              <div className="flex-1">
                <p className="text-gray-900">{instruction.description}</p>
                {instruction.culturalTechnique && (
                  <p className="text-sm text-orange-600 mt-1 italic">
                    Traditional technique: {instruction.culturalTechnique}
                  </p>
                )}
                {instruction.estimatedTime && (
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated time: {instruction.estimatedTime} minutes
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nutritional Information */}
      {recipe.nutritionalInfo && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Nutritional Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(recipe.nutritionalInfo.calories)}</div>
              <div className="text-sm text-gray-600">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(recipe.nutritionalInfo.protein)}g</div>
              <div className="text-sm text-gray-600">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(recipe.nutritionalInfo.carbs)}g</div>
              <div className="text-sm text-gray-600">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(recipe.nutritionalInfo.fat)}g</div>
              <div className="text-sm text-gray-600">Fat</div>
            </div>
          </div>
        </div>
      )}

      {/* Cultural Context */}
      {recipe.culturalOrigin.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center">
            <Globe className="w-6 h-6 mr-2" />
            Cultural Context
          </h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-orange-800">Origin: </span>
              <span className="text-orange-700">{recipe.culturalOrigin.join(', ')}</span>
            </div>
            <div>
              <span className="font-medium text-orange-800">Cuisine: </span>
              <span className="text-orange-700 capitalize">{recipe.cuisine}</span>
            </div>
            <div>
              <span className="font-medium text-orange-800">Authenticity Score: </span>
              <div className="inline-flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(recipe.metadata.culturalAuthenticity / 2)
                        ? 'fill-orange-400 text-orange-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-orange-700">
                  ({recipe.metadata.culturalAuthenticity}/10)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewsTab = () => (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Reviews & Ratings</h3>
          <button
            onClick={handleRate}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Write Review
          </button>
        </div>
        
        {recipe.ratings.length > 0 ? (
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
              <div className="flex items-center justify-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">{recipe.ratings.length} reviews</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No reviews yet. Be the first to review this recipe!</p>
        )}
      </div>

      {/* Reviews List */}
      {recipe.reviews.length > 0 && (
        <div className="space-y-4">
          {recipe.reviews.map((review, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">{review.userName}</div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
              <p className="text-gray-700">{review.review}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Recipes
            </button>
            
          <div className="flex items-center space-x-2">
              {/* Selected store badge */}
              <span className="hidden md:inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs mr-1">
                {selectedStore.name || (profile as any)?.preferences?.defaultStore?.name
                  ? `Store: ${selectedStore.name || (profile as any)?.preferences?.defaultStore?.name}`
                  : 'Store: Any'}
              </span>
              <div className="hidden md:flex items-center space-x-2 mr-2">
                <input
                  value={zipInput}
                  onChange={e => setZipInput(e.target.value)}
                  placeholder="ZIP"
                  className="w-24 px-2 py-1 border border-gray-300 rounded"
                />
                <button
                  onClick={fetchStores}
                  className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200"
                >Find Stores</button>
                <select
                  value={selectedStore.id || ''}
                  onChange={e => setSelectedStore({ id: e.target.value, name: stores.find(s => s.id === e.target.value)?.name })}
                  className="px-2 py-1 border border-gray-300 rounded"
                >
                  <option value="">Any nearby</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={saveDefaultStore}
                  disabled={!selectedStore.id}
                  className="px-2 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded border border-green-200 disabled:opacity-50"
                  title="Set as your default store"
                >Set Default</button>
              </div>
              <button
                onClick={handleFavorite}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorited
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              
              {recipe.source === 'user' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  {(recipe as any)?.metadata?.sourceUrl && (
                    <button
                      onClick={handleRefineFromSource}
                      disabled={refining}
                      title="Re-import ingredients and image from the original page"
                      className="p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {refining ? 'Refining…' : 'Refine'}
                    </button>
                  )}
                  
                  <button
                    onClick={handleDelete}
                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Recipe Header */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
                {recipe.description && (
                  <p className="text-gray-600 mb-4">{recipe.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {recipe.costAnalysis?.costPerServing ? (
                    <span className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      ${Number(recipe.costAnalysis.costPerServing).toFixed(2)} / serving
                    </span>
                  ) : null}
                  <span className="flex items-center">
                    <Globe className="w-4 h-4 mr-1" />
                    {recipe.culturalOrigin.join(', ')}
                  </span>
                  
                  {averageRating > 0 && (
                    <span className="flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                      {averageRating.toFixed(1)} ({recipe.ratings.length})
                    </span>
                  )}
                  
                  <span className="capitalize">{recipe.source} recipe</span>
                </div>
              </div>
            </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}


          </div>

          {/* Quick Review Modal */}
          <div ref={quickRef} />
          {openQuickIndex !== null && pricingDetails[openQuickIndex] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setOpenQuickIndex(null)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-5 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <div className="text-xl font-semibold text-gray-900">Review match for <span className="text-blue-700">{pricingDetails[openQuickIndex].name}</span></div>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={searchQuery}
                        onChange={(e)=>setSearchQuery(e.target.value)}
                        onKeyDown={(e)=>{ if (e.key==='Enter') performSearch(openQuickIndex,false) }}
                        placeholder="Search Kroger products"
                        className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={()=>performSearch(openQuickIndex,false)}
                        disabled={searchLoading}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
                      >{searchLoading? 'Searching…' : 'Search'}</button>
                      <label className="ml-2 inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={pricedOnly} onChange={(e)=>{ setPricedOnly(e.target.checked); performSearch(openQuickIndex,false) }} />
                        Priced only
                      </label>
                    </div>
                  </div>
                  <button onClick={() => setOpenQuickIndex(null)} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {(() => { const current = pricingDetails[openQuickIndex]!; return (current.topCandidates || []).map((c: any, j: number) => (
                    <div key={`modal_cand_${openQuickIndex}_${j}`} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        {c.image && <img src={c.image} alt="" className="w-12 h-12 object-cover rounded" />}
                        <div className="min-w-0">
                          <div className="text-gray-900 text-base truncate">{highlightMatch(c.description || 'Product', normalizedTokens(searchQuery || current.name))}</div>
                          <div className="text-xs text-gray-500 truncate">{c.size || ''} {c.category ? `• ${c.category}` : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {c.storeName && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200" title="Store providing this price">{c.storeName}</span>
                        )}
                        <div className="text-base font-medium text-gray-900">{(c.price || 0) > 0 ? `$${(c.price || 0).toFixed(2)}` : 'Not priced'}</div>
                        <button onClick={() => useCandidate(openQuickIndex!, c)} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700">Use this</button>
                      </div>
                    </div>
                  )) })()}
                  {(() => { const current = pricingDetails[openQuickIndex]!; return (!current.topCandidates || current.topCandidates.length === 0) })() && (
                    <div className="text-sm text-gray-700">Fetching alternatives…</div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={()=>performSearch(openQuickIndex,true)}
                    disabled={searchLoading}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >{searchLoading ? 'Loading…' : 'Load more'}</button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'cultural-pricing', label: 'Cultural Pricing' },
                  { id: 'reviews', label: 'Reviews' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && renderOverviewTab()}

              {activeTab === 'pricing' && (
                  <PricingPanel
                    items={pricingDetails.map((row, i) => ({
                      id: i,
                      original: `${recipe.ingredients[i]?.amount ?? ''} ${recipe.ingredients[i]?.unit ?? ''} ${recipe.ingredients[i]?.name ?? row.name}`.trim(),
                      matched: row.product?.description || 'No match found',
                      priceLabel: (() => {
                        const p = row.product?.items?.find((it:any)=>it?.price?.promo || it?.price?.regular)?.price
                        const price = p?.promo ?? p?.regular
                        if (typeof price === 'number' && row.packageSize) return `$${price.toFixed(2)} per ${row.packageSize}`
                        return undefined
                      })(),
                      estimatedCost: row.portionCost || row.estimatedCost || 0,
                      needsReview: (row.confidence ?? 1) < 0.5 || !row.product,
                      confidence: row.confidence ?? 1,
                      packages: row.packages,
                      packageSize: row.packageSize,
                      portionCost: row.portionCost,
                      packagePrice: row.packagePrice,
                    }))}
                    totalEstimated={pricingDetails.reduce((s, r) => s + (r.estimatedCost || 0), 0)}
                    onReview={(idx) => reviewPricingFor(idx)}
                    onSearch={(idx) => fetchAlternativesFor(idx)}
                  />
              )}

              {activeTab === 'scaling' && (
                <RecipeScaling recipe={recipe} />
              )}
              {activeTab === 'cultural-pricing' && profile && (
                <SimplePricingPanel
                  ingredients={recipe.ingredients}
                  zipCode={zipInput || userLocation.zipCode}
                  city={userLocation.city}
                  culturalContext={recipe.culturalOrigin.join(', ') || 'general'}
                />
              )}
              {activeTab === 'reviews' && renderReviewsTab()}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
