"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Clock, Users, DollarSign, MoreHorizontal, Pin, Eye, X } from 'lucide-react';
import { RecipeSearchModal } from './RecipeSearchModal';

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cookTime: number;
  servings: number;
  costRange: { min: number; max: number };
  cuisine: string;
  difficulty: string;
  sourceUrl?: string;
  imageUrl?: string;
}

interface ExpandableRecipeCardProps {
  recipe: Recipe;
  position: number;
  onRecipeChange?: (newRecipe: Recipe) => void;
}

export function ExpandableRecipeCard({ recipe, position, onRecipeChange }: ExpandableRecipeCardProps) {
  const [active, setActive] = useState<Recipe | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(null);
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  const handleRecipeSelect = (newRecipe: Recipe) => {
    if (onRecipeChange) {
      onRecipeChange(newRecipe);
    }
    setShowSearchModal(false);
  };

  const RecipeContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Ingredients</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            1 lb chicken breast, sliced thin
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            2 cups mixed vegetables (bell peppers, broccoli, carrots)
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            3 tbsp soy sauce (low sodium)
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            2 tbsp vegetable oil
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            3 cloves garlic, minced
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            1 tbsp fresh ginger, grated
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cultural-primary rounded-full mr-3"></span>
            2 green onions, chopped
          </li>
        </ul>
      </div>
      
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Instructions</h4>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex">
            <span className="flex-shrink-0 w-6 h-6 bg-cultural-primary text-white rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</span>
            <span>Heat vegetable oil in a large wok or skillet over medium-high heat until shimmering.</span>
          </li>
          <li className="flex">
            <span className="flex-shrink-0 w-6 h-6 bg-cultural-primary text-white rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</span>
            <span>Add sliced chicken breast and cook for 5-6 minutes until golden brown and cooked through.</span>
          </li>
          <li className="flex">
            <span className="flex-shrink-0 w-6 h-6 bg-cultural-primary text-white rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</span>
            <span>Add minced garlic and grated ginger, stir-fry for 30 seconds until fragrant.</span>
          </li>
          <li className="flex">
            <span className="flex-shrink-0 w-6 h-6 bg-cultural-primary text-white rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">4</span>
            <span>Add mixed vegetables and stir-fry for 3-4 minutes until crisp-tender.</span>
          </li>
          <li className="flex">
            <span className="flex-shrink-0 w-6 h-6 bg-cultural-primary text-white rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">5</span>
            <span>Pour soy sauce over the mixture and toss to combine. Cook for 1 more minute.</span>
          </li>
          <li className="flex">
            <span className="flex-shrink-0 w-6 h-6 bg-cultural-primary text-white rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">6</span>
            <span>Garnish with chopped green onions and serve immediately over steamed rice.</span>
          </li>
        </ol>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Cultural Notes</h4>
        <p className="text-sm text-gray-600">
          This stir-fry technique preserves the traditional "wok hei" (breath of the wok) that gives authentic Asian stir-fries their distinctive flavor. 
          The high heat and quick cooking method maintains the vegetables' crispness while developing complex flavors.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 rounded-lg p-3">
          <span className="font-medium text-blue-900">Nutritional Density</span>
          <div className="text-blue-700 mt-1">High protein, balanced carbs</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <span className="font-medium text-green-900">Cultural Authenticity</span>
          <div className="text-green-700 mt-1">Traditional technique</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
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

      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white rounded-full h-8 w-8 shadow-lg z-10"
              onClick={() => setActive(null)}
            >
              <X className="h-4 w-4 text-gray-600" />
            </motion.button>
            
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-2xl h-full md:h-fit md:max-h-[90%] flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <motion.div layoutId={`image-${active.title}-${id}`} className="relative">
                <div className="w-full h-64 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                  <span className="text-6xl">🍳</span>
                </div>
                <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1 text-sm font-semibold text-gray-700 shadow-sm">
                  ${active.costRange.min}–${active.costRange.max}
                </div>
              </motion.div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <motion.h3
                        layoutId={`title-${active.title}-${id}`}
                        className="text-2xl font-bold text-gray-900 mb-2"
                      >
                        {active.title}
                      </motion.h3>
                      <motion.p
                        layoutId={`description-${active.description}-${id}`}
                        className="text-gray-600"
                      >
                        {active.description}
                      </motion.p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mb-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{active.cookTime} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{active.servings} servings</span>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      {active.cuisine}
                    </span>
                  </div>

                  {/* Recipe Source Attribution */}
                  {active.sourceUrl && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                      <p className="text-xs text-gray-600 mb-1">Recipe Source:</p>
                      <a 
                        href={active.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {active.sourceUrl}
                      </a>
                    </div>
                  )}

                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <RecipeContent />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Recipe Card */}
      <motion.div
        layoutId={`card-${recipe.title}-${id}`}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      >
        {/* Recipe Image */}
        <motion.div layoutId={`image-${recipe.title}-${id}`} className="relative h-48 bg-gray-200">
          <div className="absolute top-3 left-3 bg-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-700">
            ${recipe.costRange.min}
          </div>
          <div className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-700">
            ${recipe.costRange.max}
          </div>
          
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-4xl">🍳</span>
          </div>
        </motion.div>

        {/* Recipe Content */}
        <div className="p-4 space-y-3">
          <div>
            <motion.h3
              layoutId={`title-${recipe.title}-${id}`}
              className="font-semibold text-gray-900 text-lg mb-1"
            >
              {recipe.title}
            </motion.h3>
            <motion.p
              layoutId={`description-${recipe.description}-${id}`}
              className="text-gray-600 text-sm"
            >
              {recipe.description}
            </motion.p>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{recipe.cookTime} min</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} servings</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4" />
              <span>${recipe.costRange.min}–${recipe.costRange.max}</span>
            </div>
          </div>

          <div>
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
              {recipe.cuisine}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSearchModal(true);
                }}
                className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
              >
                <MoreHorizontal className="w-3 h-3" />
                <span>Swap Recipe</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors">
                <DollarSign className="w-3 h-3" />
                <span>Cheaper Option</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors">
                <Pin className="w-3 h-3" />
                <span>Pin</span>
              </button>
            </div>
            
            <button 
              onClick={() => setActive(recipe)}
              className="flex items-center space-x-1 px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>Details</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recipe Search Modal */}
      <RecipeSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectRecipe={handleRecipeSelect}
        currentRecipeTitle={recipe.title}
      />
    </>
  );
}