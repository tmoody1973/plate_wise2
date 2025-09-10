"use client"

import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useOutsideClick } from "@/hooks/use-outside-click"
import { Clock, Users, DollarSign, X } from 'lucide-react'

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
    excludedFromTotal: number;
    specialtyStoreCost: number;
  };
  imageUrl?: string;
  sourceUrl?: string;
  hasPricing: boolean;
}

interface RecipeExpandableCardProps {
  recipes: Recipe[];
  onIngredientSearch: (recipeId: string, ingredientId: string, query: string) => void;
  onIngredientStatusUpdate: (
    recipeId: string, 
    ingredientId: string, 
    status: 'normal' | 'already-have' | 'specialty-store',
    specialtyStore?: string
  ) => void;
  onSwapRecipe?: (index: number, recipe: Recipe) => void;
  replacingIndex?: number | null;
  savedIndices?: Set<number>;
  onSaveRecipe?: (index: number, recipe: Recipe) => void;
  onIngredientUnitUpdate?: (recipeId: string, ingredientId: string, unit: string) => void;
}

export default function RecipeExpandableCard({ 
  recipes, 
  onIngredientSearch, 
  onIngredientStatusUpdate,
  onSwapRecipe,
  replacingIndex,
  onSaveRecipe,
  savedIndices,
  onIngredientUnitUpdate,
}: RecipeExpandableCardProps) {
  const [active, setActive] = useState<Recipe | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(null)
      }
    }

    if (active) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [active])

  useOutsideClick(ref, () => setActive(null))

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
          />
        )}
      </AnimatePresence>

      {/* Expanded Recipe Modal */}
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-6 right-6 lg:top-4 lg:right-4 items-center justify-center bg-white rounded-full h-10 w-10 shadow-lg z-10"
              onClick={() => setActive(null)}
            >
              <X className="h-5 w-5 text-gray-600" />
            </motion.button>

            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-4xl h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Recipe Image */}
              <motion.div layoutId={`image-${active.title}-${id}`} className="relative overflow-hidden">
                {active.imageUrl ? (
                  <img
                    src={active.imageUrl}
                    alt={active.title}
                    className="w-full h-64 lg:h-80 object-cover object-center"
                    style={{
                      aspectRatio: '16/9',
                      objectPosition: 'center center'
                    }}
                  />
                ) : (
                  <div className="w-full h-64 lg:h-80 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <span className="text-8xl">🍽️</span>
                  </div>
                )}
                
                {/* Price Badge */}
                {active.hasPricing && active.pricing && (
                  <div className="absolute top-4 right-4 bg-white rounded-lg px-4 py-2 shadow-md">
                    <div className="text-2xl font-bold text-gray-900">
                      ${active.pricing.costPerServing.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">per serving</div>
                  </div>
                )}
              </motion.div>

              {/* Recipe Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <motion.h1
                    layoutId={`title-${active.title}-${id}`}
                    className="text-3xl font-bold text-gray-900 mb-2"
                  >
                    {active.title}
                  </motion.h1>
                  <motion.p
                    layoutId={`description-${active.description}-${id}`}
                    className="text-gray-600 text-lg mb-4"
                  >
                    {active.description}
                  </motion.p>

                  {/* Recipe Meta */}
                  <div className="flex items-center gap-6 text-gray-600 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span>{active.metadata.totalTime} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span>{active.metadata.servings} servings</span>
                    </div>
                    {active.hasPricing && active.pricing && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        <span>${active.pricing.totalCost.toFixed(2)} total</span>
                      </div>
                    )}
                    <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                      {active.cuisine.charAt(0).toUpperCase() + active.cuisine.slice(1)}
                    </div>
                    {active.sourceUrl && active.sourceUrl.trim() !== '' && active.sourceUrl.startsWith('http') && (
                      <a 
                        href={active.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        <span>🔗</span>
                        <span>View Original</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                  {/* Ingredients */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">🛒 Ingredients</h2>
                    <div className="space-y-3">
                      {active.ingredients.map((ingredient) => (
                        <div 
                          key={ingredient.id} 
                          className={`p-4 rounded-lg border ${
                            ingredient.userStatus === 'already-have' ? 'bg-green-50 border-green-200' :
                            ingredient.userStatus === 'specialty-store' ? 'bg-orange-50 border-orange-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-lg font-medium ${
                                  ingredient.userStatus === 'already-have' ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}>
                                  {ingredient.amount}
                                  {ingredient.unit ? ` ${ingredient.unit}` : ''}
                                  {` ${ingredient.name}`}
                                </span>
                                
                                {ingredient.isSubstituted && (
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">substituted</span>
                                )}
                                {ingredient.userStatus === 'already-have' && (
                                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">already have</span>
                                )}
                                {ingredient.userStatus === 'specialty-store' && (
                                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                    {ingredient.specialtyStore || 'specialty store'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => onIngredientSearch(active.id, ingredient.id, ingredient.name)}
                                  className="text-blue-600 hover:text-blue-800 text-sm bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-full transition-colors"
                                >
                                  🔍 Find alternatives
                                </button>
                                {!ingredient.unit && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-600">Set unit:</span>
                                    {['tsp','tbsp','cup','oz','g','ml','each'].map(u => (
                                      <button
                                        key={u}
                                        onClick={() => onIngredientUnitUpdate && onIngredientUnitUpdate(active.id, ingredient.id, u)}
                                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                                        title="Set unit"
                                      >{u}</button>
                                    ))}
                                  </div>
                                )}
                                
                                {ingredient.userStatus !== 'already-have' && (
                                  <button
                                    onClick={() => onIngredientStatusUpdate(active.id, ingredient.id, 'already-have')}
                                    className="text-green-600 hover:text-green-800 text-sm bg-green-100 hover:bg-green-200 px-3 py-1 rounded-full transition-colors"
                                  >
                                    ✓ Already have
                                  </button>
                                )}
                                
                                {ingredient.userStatus !== 'specialty-store' && (
                                  <button
                                    onClick={() => {
                                      const store = prompt('Enter specialty store name (e.g., "Asian market", "Halal store"):');
                                      if (store) {
                                        onIngredientStatusUpdate(active.id, ingredient.id, 'specialty-store', store);
                                      }
                                    }}
                                    className="text-orange-600 hover:text-orange-800 text-sm bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded-full transition-colors"
                                  >
                                    🏪 Specialty store
                                  </button>
                                )}
                                
                                {ingredient.userStatus !== 'normal' && (
                                  <button
                                    onClick={() => onIngredientStatusUpdate(active.id, ingredient.id, 'normal')}
                                    className="text-gray-600 hover:text-gray-800 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                                  >
                                    ↺ Reset
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {ingredient.krogerPrice && (
                              <div className="text-right ml-4">
                                <span className={`text-lg font-bold ${
                                  ingredient.userStatus === 'already-have' ? 'line-through text-gray-400' : 'text-green-600'
                                }`}>
                                  ${ingredient.krogerPrice.totalCost.toFixed(2)}
                                </span>
                                {ingredient.krogerPrice && (ingredient.krogerPrice as any).adjusted && (
                                  <div className="text-[11px] text-orange-700 bg-orange-100 inline-block px-2 py-0.5 rounded ml-1" title="Estimated using typical package size">Estimated</div>
                                )}
                                {ingredient.krogerPrice.unitPrice && ( 
                                  <div className="text-xs text-gray-500">${ingredient.krogerPrice.unitPrice.toFixed(2)} per {ingredient.krogerPrice.baseUnit || 'unit'}</div>
                                )}
                                {ingredient.krogerPrice.packageCount && ingredient.krogerPrice.packageSize && (
                                  <div className="text-xs text-gray-500">
                                    {ingredient.krogerPrice.packageCount} pkg × {Math.round(ingredient.krogerPrice.packageSize)} {ingredient.krogerPrice.baseUnit || ''}
                                    {typeof ingredient.krogerPrice.leftoverAmount === 'number' && ingredient.krogerPrice.leftoverAmount > 0 ? (
                                      <span> • leftover ~{Math.round(ingredient.krogerPrice.leftoverAmount)} {ingredient.krogerPrice.baseUnit || ''}</span>
                                    ) : null}
                                  </div>
                                )}
                                {/* Explain price tooltip */}
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  <span
                                    className="underline decoration-dotted cursor-help"
                                    title={`Required: ${Math.round((ingredient.krogerPrice as any).requiredAmount || 0)} ${(ingredient.krogerPrice as any).baseUnit || ''}; Package: ${Math.round((ingredient.krogerPrice as any).packageSize || 0)} ${(ingredient.krogerPrice as any).baseUnit || ''}; Packages: ${(ingredient.krogerPrice as any).packageCount || 1}; Per-${(ingredient.krogerPrice as any).baseUnit || 'unit'}: $${(ingredient.krogerPrice.unitPrice || 0).toFixed(2)}; Total: $${(ingredient.krogerPrice.totalCost || 0).toFixed(2)}${(ingredient.krogerPrice as any).adjusted ? ' (estimated size)' : ''}`}
                                  >ⓘ Explain price</span>
                                </div>
                                {ingredient.krogerPrice.onSale && (
                                  <div className="text-sm text-red-600 font-medium">ON SALE!</div>
                                )}
                                {ingredient.krogerPrice.storeLocation && (
                                  <div className="text-sm text-gray-500">@ {ingredient.krogerPrice.storeLocation}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">👨‍🍳 Instructions</h2>
                    <div className="space-y-4">
                      {active.instructions.map((instruction, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <p className="text-gray-700 leading-relaxed pt-1 text-lg">{instruction}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recipes.map((recipe, index) => (
          <motion.div
            layoutId={`card-${recipe.title}-${id}`}
            key={`card-${recipe.title}-${id}`}
            onClick={() => setActive(recipe)}
            className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Recipe Image */}
            <div className="relative h-48 bg-gradient-to-br from-orange-400 to-red-500 overflow-hidden">
              <motion.div layoutId={`image-${recipe.title}-${id}`} className="w-full h-full">
                {recipe.imageUrl ? (
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.title}
                    className="w-full h-full object-cover object-center"
                    style={{
                      aspectRatio: '4/3',
                      objectPosition: 'center center'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
              </motion.div>
              
              {/* Day label */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                Day {index + 1}
              </div>

              {/* Price Badge */}
              {recipe.hasPricing && recipe.pricing && (
                <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-2 shadow-md">
                  <div className="text-xl font-bold text-gray-900">
                    ${recipe.pricing.costPerServing.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-600">per serving</div>
                </div>
              )}

              {/* Replacing overlay */}
              {typeof replacingIndex === 'number' && replacingIndex === index && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {/* Saved badge */}
              {savedIndices && savedIndices.has(index) && (
                <div className="absolute top-3 right-3 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium shadow">
                  Saved
                </div>
              )}
            </div>

            {/* Recipe Content */}
            <div className="p-6">
              {/* Title and Description */}
              <div className="mb-4">
                <motion.h3 
                  layoutId={`title-${recipe.title}-${id}`}
                  className="text-xl font-bold text-gray-900 mb-2"
                >
                  {recipe.title}
                </motion.h3>
                <motion.p 
                  layoutId={`description-${recipe.description}-${id}`}
                  className="text-gray-600 text-base leading-relaxed"
                >
                  {recipe.description}
                </motion.p>
              </div>

              {/* Recipe Meta Info */}
              <div className="flex items-center gap-6 mb-4 text-base text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{Math.floor(recipe.metadata.totalTime * 0.3)}min prep</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{recipe.metadata.servings} servings</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {recipe.hasPricing && recipe.pricing 
                      ? `$${(recipe.pricing.totalCost).toFixed(0)}–$${(recipe.pricing.totalCost * 1.2).toFixed(0)}`
                      : '$16–$20'
                    }
                  </span>
                </div>
              </div>

              {/* Cuisine Tag */}
              <div className="mb-4">
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {recipe.cuisine.charAt(0).toUpperCase() + recipe.cuisine.slice(1)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                  onClick={(e) => { e.stopPropagation(); onSwapRecipe && onSwapRecipe(index, recipe); }}
                >
                  <span>🔄</span>
                  <span>Swap Recipe</span>
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 font-medium transition-colors"
                  onClick={(e) => { e.stopPropagation(); onSaveRecipe && onSaveRecipe(index, recipe); }}
                >
                  <span>💾</span>
                  <span>Save to My Recipes</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
                  <span>💰</span>
                  <span>Cheaper Option</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
                  <span>📌</span>
                  <span>Pin</span>
                </button>
{recipe.sourceUrl && recipe.sourceUrl.trim() !== '' && recipe.sourceUrl.startsWith('http') && (
                  <a 
                    href={recipe.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 font-medium transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>🔗</span>
                    <span>View Source</span>
                  </a>
                )}
                {(!recipe.sourceUrl || recipe.sourceUrl.trim() === '' || !recipe.sourceUrl.startsWith('http')) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-500 font-medium">
                    <span>📝</span>
                    <span>Recipe Available</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  )
}
