'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save, X, Clock, Users, Globe, Tag, Mic, Image as ImageIcon } from 'lucide-react';
import { recipeService } from '@/lib/recipes';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Recipe, Ingredient, Instruction } from '@/types';
import type { CreateRecipeInput, UpdateRecipeInput } from '@/lib/recipes/recipe-database-service';

interface RecipeFormProps {
  recipe?: Recipe;
  parsedRecipe?: CreateRecipeInput;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function RecipeForm({ recipe, parsedRecipe, onSave, onCancel, isEditing = false }: RecipeFormProps) {
  const { user } = useAuthContext();
  const [formData, setFormData] = useState<CreateRecipeInput>({
    title: '',
    description: '',
    culturalOrigin: [],
    cuisine: '',
    ingredients: [{ 
      id: '1', 
      name: '', 
      amount: 0, 
      unit: '', 
      culturalName: '', 
      substitutes: [], 
      costPerUnit: 0, 
      availability: [],
      culturalSignificance: ''
    }],
    instructions: [{ step: 1, description: '', culturalTechnique: '' }],
    metadata: {
      servings: 4,
      prepTime: 0,
      cookTime: 0,
      totalTime: 0,
      difficulty: 'medium',
      culturalAuthenticity: 5,
    },
    tags: [],
    source: 'user',
    isPublic: false,
  });

  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  const withUniqueIds = (ings: any[]): any[] => {
    const used = new Set<string>();
    return (ings || []).map((ing, i) => {
      let id = String(ing.id || `ing_${i+1}`);
      if (used.has(id)) {
        id = `ing_${i+1}_${Math.random().toString(36).slice(2,7)}`;
      }
      used.add(id);
      return { ...ing, id };
    });
  };

  // Initialize form with existing recipe data or parsed recipe data
  useEffect(() => {
    if (recipe) {
      setFormData({
        title: recipe.title,
        description: recipe.description,
        culturalOrigin: recipe.culturalOrigin,
        cuisine: recipe.cuisine,
        ingredients: withUniqueIds(recipe.ingredients),
        instructions: recipe.instructions,
        nutritionalInfo: recipe.nutritionalInfo,
        costAnalysis: recipe.costAnalysis,
        metadata: recipe.metadata,
        tags: recipe.tags,
        source: recipe.source,
        isPublic: recipe.source === 'community',
      });
    } else if (parsedRecipe) {
      setFormData(prev => ({
        ...prev,
        title: parsedRecipe.title || prev.title,
        description: parsedRecipe.description || prev.description,
        culturalOrigin: parsedRecipe.culturalOrigin || prev.culturalOrigin,
        cuisine: parsedRecipe.cuisine || prev.cuisine,
        ingredients: (parsedRecipe.ingredients && parsedRecipe.ingredients.length > 0) ? withUniqueIds(parsedRecipe.ingredients) : prev.ingredients,
        instructions: (parsedRecipe.instructions && parsedRecipe.instructions.length > 0) ? parsedRecipe.instructions : prev.instructions,
        metadata: {
          servings: parsedRecipe.metadata?.servings ?? prev.metadata.servings,
          prepTime: parsedRecipe.metadata?.prepTime ?? prev.metadata.prepTime,
          cookTime: parsedRecipe.metadata?.cookTime ?? prev.metadata.cookTime,
          totalTime: parsedRecipe.metadata?.totalTime ?? (parsedRecipe.metadata ? ((parsedRecipe.metadata.prepTime || 0) + (parsedRecipe.metadata.cookTime || 0)) : prev.metadata.totalTime),
          difficulty: parsedRecipe.metadata?.difficulty ?? prev.metadata.difficulty,
          culturalAuthenticity: parsedRecipe.metadata?.culturalAuthenticity ?? prev.metadata.culturalAuthenticity,
        },
        tags: parsedRecipe.tags || prev.tags,
        source: parsedRecipe.source || prev.source,
        isPublic: parsedRecipe.isPublic || false,
      }));
    }
  }, [recipe, parsedRecipe]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Recipe title is required';
    }

    if (!formData.cuisine.trim()) {
      newErrors.cuisine = 'Cuisine type is required';
    }

    if (formData.ingredients.length === 0 || formData.ingredients.every(ing => !ing.name.trim())) {
      newErrors.ingredients = 'At least one ingredient is required';
    }

    if (formData.instructions.length === 0 || formData.instructions.every(inst => !inst.description.trim())) {
      newErrors.instructions = 'At least one instruction is required';
    }

    if (formData.metadata.servings < 1) {
      newErrors.servings = 'Servings must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    console.log('Form data:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    console.log('Form validation passed');

    setSaving(true);
    try {
      // Calculate total time
      const totalTime = formData.metadata.prepTime + formData.metadata.cookTime;
      const updatedFormData = {
        ...formData,
        metadata: {
          ...formData.metadata,
          totalTime,
        },
        // Filter out empty ingredients and instructions
        ingredients: formData.ingredients.filter(ing => ing.name.trim()),
        instructions: formData.instructions.filter(inst => inst.description.trim()),
      };

      let savedRecipe: Recipe | null = null;

      if (isEditing && recipe) {
        // Update existing recipe
        const updateData: UpdateRecipeInput = {
          id: recipe.id,
          ...updatedFormData,
        };
        savedRecipe = await recipeService.updateRecipe(updateData, recipe.authorId || '');
      } else {
        // Create new recipe
        console.log('User object:', user);
        console.log('User ID:', user?.id);
        if (!user?.id) {
          console.error('User not authenticated:', user);
          setErrors({ 
            submit: 'You must be logged in to save recipes. Please sign in first and make sure your profile is set up.' 
          });
          return;
        }
        console.log('Attempting to create recipe with data:', updatedFormData);
        savedRecipe = await recipeService.createRecipe(updatedFormData, user.id);
        console.log('Recipe creation result:', savedRecipe);
      }

      if (savedRecipe) {
        console.log('✅ Recipe saved successfully:', savedRecipe);
        onSave(savedRecipe);
      } else {
        console.error('❌ Recipe creation failed - returned null');
        setErrors({ 
          submit: 'Failed to save recipe. This might be due to a database connection issue or missing user profile. Please try again or contact support if the problem persists.' 
        });
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setErrors({ submit: 'An error occurred while saving the recipe.' });
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    const newId = (formData.ingredients.length + 1).toString();
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { 
          id: newId, 
          name: '', 
          amount: 0, 
          unit: '', 
          culturalName: '', 
          substitutes: [], 
          costPerUnit: 0, 
          availability: [],
          culturalSignificance: ''
        },
      ],
    });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updatedIngredients = [...formData.ingredients];
    const currentIngredient = updatedIngredients[index];
    
    if (!currentIngredient) return;
    
    // Ensure all required fields are present
    updatedIngredients[index] = {
      id: currentIngredient.id || `ing_${index}`,
      name: currentIngredient.name || '',
      amount: currentIngredient.amount || 0,
      unit: currentIngredient.unit || '',
      culturalName: currentIngredient.culturalName,
      substitutes: currentIngredient.substitutes || [],
      costPerUnit: currentIngredient.costPerUnit || 0,
      availability: currentIngredient.availability || [],
      culturalSignificance: currentIngredient.culturalSignificance,
      ...{ [field]: value }
    };
    
    setFormData({ ...formData, ingredients: updatedIngredients });
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [
        ...formData.instructions,
        { step: formData.instructions.length + 1, description: '', culturalTechnique: '' },
      ],
    });
  };

  const removeInstruction = (index: number) => {
    const updatedInstructions = formData.instructions
      .filter((_, i) => i !== index)
      .map((inst, i) => ({ ...inst, step: i + 1 }));
    
    setFormData({ ...formData, instructions: updatedInstructions });
  };

  const updateInstruction = (index: number, field: keyof Instruction, value: any) => {
    const updatedInstructions = [...formData.instructions];
    const currentInstruction = updatedInstructions[index];
    
    if (!currentInstruction) return;
    
    // Ensure all required fields are present
    updatedInstructions[index] = {
      step: currentInstruction.step || index + 1,
      description: currentInstruction.description || '',
      culturalTechnique: currentInstruction.culturalTechnique,
      estimatedTime: currentInstruction.estimatedTime,
      ...{ [field]: value }
    };
    
    setFormData({ ...formData, instructions: updatedInstructions });
  };

  const handleVoiceInput = async () => {
    setShowVoiceInput(true);
    // TODO: Implement voice input functionality
    console.log('Voice input not yet implemented');
    setShowVoiceInput(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement image parsing functionality
      console.log('Image parsing not yet implemented');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Recipe' : 'Create New Recipe'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipe Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
              placeholder="Enter recipe title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Cuisine Type *
            </label>
            <select
              value={formData.cuisine}
              onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.cuisine ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
            >
              <option value="">Select cuisine</option>
              <option value="italian">Italian</option>
              <option value="mexican">Mexican</option>
              <option value="chinese">Chinese</option>
              <option value="indian">Indian</option>
              <option value="japanese">Japanese</option>
              <option value="thai">Thai</option>
              <option value="french">French</option>
              <option value="mediterranean">Mediterranean</option>
              <option value="middle-eastern">Middle Eastern</option>
              <option value="african">African</option>
              <option value="american">American</option>
              <option value="international">International</option>
            </select>
            {errors.cuisine && <p className="text-red-500 text-sm mt-1">{errors.cuisine}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Describe your recipe..."
          />
        </div>

        {/* Recipe Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Servings *
            </label>
            <input
              type="number"
              min="1"
              value={formData.metadata.servings}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, servings: parseInt(e.target.value) || 1 }
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Prep Time (min)
            </label>
            <input
              type="number"
              min="0"
              value={formData.metadata.prepTime}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, prepTime: parseInt(e.target.value) || 0 }
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cook Time (min)
            </label>
            <input
              type="number"
              min="0"
              value={formData.metadata.cookTime}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, cookTime: parseInt(e.target.value) || 0 }
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={formData.metadata.difficulty}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, difficulty: e.target.value as any }
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>



        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Ingredients *</h3>
            <button
              type="button"
              onClick={addIngredient}
              className="inline-flex items-center px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md text-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Ingredient
            </button>
          </div>
          
          {errors.ingredients && <p className="text-red-500 text-sm mb-2">{errors.ingredients}</p>}
          
          <div className="space-y-3">
            {formData.ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    step="0.1"
                    value={ingredient.amount || ''}
                    onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Unit</option>
                    <option value="cup">Cup</option>
                    <option value="tbsp">Tbsp</option>
                    <option value="tsp">Tsp</option>
                    <option value="lb">Pound</option>
                    <option value="oz">Ounce</option>
                    <option value="g">Gram</option>
                    <option value="kg">Kilogram</option>
                    <option value="ml">Milliliter</option>
                    <option value="l">Liter</option>
                    <option value="piece">Piece</option>
                    <option value="clove">Clove</option>
                    <option value="pinch">Pinch</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Cultural name (optional)"
                    value={ingredient.culturalName || ''}
                    onChange={(e) => updateIngredient(index, 'culturalName', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Instructions *</h3>
            <button
              type="button"
              onClick={addInstruction}
              className="inline-flex items-center px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md text-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </button>
          </div>
          
          {errors.instructions && <p className="text-red-500 text-sm mb-2">{errors.instructions}</p>}
          
          <div className="space-y-4">
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {instruction.step}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    placeholder="Describe this step..."
                    value={instruction.description}
                    onChange={(e) => updateInstruction(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Cultural technique (optional)"
                    value={instruction.culturalTechnique || ''}
                    onChange={(e) => updateInstruction(index, 'culturalTechnique', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., vegetarian, quick, comfort food"
          />
        </div>

        {/* Privacy Setting */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic || false}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Make this recipe public (visible to the community)
            </span>
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          {errors.submit && (
            <p className="text-red-500 text-sm">{errors.submit}</p>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Recipe' : 'Save Recipe'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RecipeForm;
