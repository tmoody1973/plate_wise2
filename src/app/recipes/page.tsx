"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/AppLayout';
const RecipeList = dynamic(() => import('@/components/recipes/RecipeList').then(m => m.RecipeList), { ssr: false });
const RecipeForm = dynamic(() => import('@/components/recipes/RecipeForm').then(m => m.RecipeForm), { ssr: false });
const RecipeRecommendations = dynamic(() => import('@/components/recipes/RecipeRecommendations').then(m => m.RecipeRecommendations), { ssr: false });
const RecipeInputModal = dynamic(() => import('@/components/recipes/RecipeInputModal').then(m => m.RecipeInputModal), { ssr: false });
const OpenAIWebSearch = dynamic(() => import('@/components/recipes/OpenAIWebSearch').then(m => m.OpenAIWebSearch), { ssr: false });
import { useAuthContext } from '@/contexts/AuthContext';
import type { Recipe } from '@/types';
import type { CreateRecipeInput } from '@/lib/recipes/recipe-database-service';
import { useToast } from '@/components/ui/toast';

export default function RecipesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showSpoonacularSearch, setShowSpoonacularSearch] = useState(false);
  // Simplify discover view to a single AI web search (OpenAI)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [parsedRecipe, setParsedRecipe] = useState<CreateRecipeInput | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [backfilling, setBackfilling] = useState(false)
  const { user } = useAuthContext()
  const { addToast } = useToast()

  const handleCreateRecipe = () => {
    setShowInputModal(true);
  };

  const handleManualCreate = () => {
    setShowCreateForm(true);
    setEditingRecipe(null);
    setParsedRecipe(null);
  };

  const handleRecipeParsed = (recipe: CreateRecipeInput) => {
    setParsedRecipe(recipe);
    setShowInputModal(false);
    setShowCreateForm(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowCreateForm(true);
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    // Recipe saved successfully
    console.log('Recipe saved successfully:', recipe);
    setShowCreateForm(false);
    setEditingRecipe(null);
    setParsedRecipe(null);
    // Trigger recipe list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingRecipe(null);
  };

  const handleAddToCollection = (recipeId: string) => {
    // TODO: Implement collection selection modal
    console.log('Add recipe to collection:', recipeId);
  };

  const handleRateRecipe = (recipeId: string) => {
    // TODO: Implement rating modal
    console.log('Rate recipe:', recipeId);
  };

  // Spoonacular/Tavily sources removed for simplicity.

  async function handleBackfill() {
    if (!user?.id) return
    try {
      setBackfilling(true)
      const res = await fetch('/api/recipes/refine-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const j = await res.json()
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Backfill failed')
      addToast({ type: 'success', title: 'Backfill complete', message: `Updated ${j.updated}/${j.scanned} recipes` })
      setRefreshTrigger(v => v + 1)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Backfill failed', message: e?.message })
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {showCreateForm ? (
          <RecipeForm
            recipe={editingRecipe || undefined}
            parsedRecipe={parsedRecipe || undefined}
            isEditing={!!editingRecipe}
            onSave={handleSaveRecipe}
            onCancel={handleCancelForm}
          />
        ) : showSpoonacularSearch ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Discover Recipes</h1>
              <button
                onClick={() => setShowSpoonacularSearch(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
              >
                Back to My Recipes
              </button>
            </div>
            <div className="text-sm text-gray-600">AI Web Search</div>
            <OpenAIWebSearch />
          </div>
        ) : (
          <div className="space-y-8">
            <RecipeRecommendations className="mb-8" />
            
            {/* Recipe Source Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setShowSpoonacularSearch(false)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    !showSpoonacularSearch
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Recipes
                </button>
                <button
                  onClick={() => setShowSpoonacularSearch(true)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    showSpoonacularSearch
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Discover New Recipes
                </button>
              </div>
              <div>
                {!showSpoonacularSearch && (
                  <button
                    onClick={handleBackfill}
                    disabled={backfilling || !user}
                    className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
                    title="Re-import missing units/images for your recipes"
                  >
                    {backfilling ? 'Backfilling…' : 'Backfill Missing' }
                  </button>
                )}
              </div>
            </div>
            
            <RecipeList
              key={refreshTrigger}
              showSearch={true}
              showCreateButton={true}
              title={showSpoonacularSearch ? "Discover New Recipes" : "My Recipes"}
              showUserRecipes={!showSpoonacularSearch}
              emptyMessage={!showSpoonacularSearch ? "No recipes found. Create your first recipe to get started!" : "No recipes found. Try adjusting your search filters."}
              onCreateRecipe={handleCreateRecipe}
              onAddToCollection={handleAddToCollection}
              onRateRecipe={handleRateRecipe}
            />
          </div>
        )}
        
        <RecipeInputModal
          isOpen={showInputModal}
          onClose={() => setShowInputModal(false)}
          onRecipeParsed={handleRecipeParsed}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
