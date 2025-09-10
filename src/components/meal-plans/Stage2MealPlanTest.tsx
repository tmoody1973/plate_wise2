'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Clock, DollarSign, Users, Globe, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  success: boolean;
  mealPlan?: any;
  metadata?: {
    generatedAt: string;
    processingTime: string;
    pipeline: string;
    extractionMethods: string[];
  };
  error?: string;
}

export function Stage2MealPlanTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  
  // Form state
  const [numberOfMeals, setNumberOfMeals] = useState(4);
  const [culturalCuisines, setCulturalCuisines] = useState('Mexican, West African');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('halal_friendly');
  const [householdSize, setHouseholdSize] = useState(4);
  const [maxTime, setMaxTime] = useState(45);
  const [pantry, setPantry] = useState('rice, onion, beans');
  const [exclude, setExclude] = useState('peanuts, pork');

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const requestBody = {
        numberOfMeals,
        culturalCuisines: culturalCuisines.split(',').map(c => c.trim()).filter(Boolean),
        dietaryRestrictions: dietaryRestrictions.split(',').map(d => d.trim()).filter(Boolean),
        householdSize,
        maxTime,
        pantry: pantry.split(',').map(p => p.trim()).filter(Boolean),
        exclude: exclude.split(',').map(e => e.trim()).filter(Boolean),
        weeklyBudget: 100 // Optional for testing
      };

      console.log('🧪 Testing Stage 1 + Stage 2 pipeline with:', requestBody);

      const response = await fetch('/api/meal-plans/test-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Stage 1 + Stage 2 Meal Plan Test</h1>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          Test the complete pipeline: <strong>Perplexity AI</strong> discovers real recipe URLs, 
          then <strong>WebScraping.AI</strong> extracts complete recipe data with ingredients and instructions.
          <br />
          <span className="text-sm text-blue-600">No authentication required for testing</span>
        </p>
        
        <div className="flex items-center justify-center gap-4 text-sm">
          <Badge variant="outline" className="bg-blue-50">
            Stage 1: Perplexity AI
          </Badge>
          <span>→</span>
          <Badge variant="outline" className="bg-green-50">
            Stage 2: WebScraping.AI
          </Badge>
          <span>→</span>
          <Badge variant="outline" className="bg-purple-50">
            Real Recipes
          </Badge>
        </div>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Customize the meal plan parameters to test different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="numberOfMeals">Number of Meals</Label>
              <Input
                id="numberOfMeals"
                type="number"
                value={numberOfMeals}
                onChange={(e) => setNumberOfMeals(parseInt(e.target.value) || 4)}
                min={1}
                max={10}
              />
            </div>
            
            <div>
              <Label htmlFor="householdSize">Household Size</Label>
              <Input
                id="householdSize"
                type="number"
                value={householdSize}
                onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 4)}
                min={1}
                max={12}
              />
            </div>
            
            <div>
              <Label htmlFor="maxTime">Max Cooking Time (minutes)</Label>
              <Input
                id="maxTime"
                type="number"
                value={maxTime}
                onChange={(e) => setMaxTime(parseInt(e.target.value) || 45)}
                min={15}
                max={120}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="culturalCuisines">Cultural Cuisines (comma-separated)</Label>
              <Input
                id="culturalCuisines"
                value={culturalCuisines}
                onChange={(e) => setCulturalCuisines(e.target.value)}
                placeholder="Mexican, West African, Italian"
              />
            </div>
            
            <div>
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions (comma-separated)</Label>
              <Input
                id="dietaryRestrictions"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="halal_friendly, vegetarian, gluten_free"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pantry">Pantry Items (comma-separated)</Label>
              <Textarea
                id="pantry"
                value={pantry}
                onChange={(e) => setPantry(e.target.value)}
                placeholder="rice, onion, beans, garlic, olive oil"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="exclude">Exclude Ingredients (comma-separated)</Label>
              <Textarea
                id="exclude"
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
                placeholder="peanuts, pork, shellfish"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={runTest} 
          disabled={isLoading}
          size="lg"
          className="min-w-[250px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Real Recipes...
            </>
          ) : (
            'Test Stage 1 + Stage 2 Pipeline'
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-6">
          {result.success ? (
            <>
              {/* Pipeline Metadata */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    Pipeline Success
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-green-800">Pipeline</div>
                      <div className="text-green-600">{result.metadata?.pipeline}</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800">Processing</div>
                      <div className="text-green-600">{result.metadata?.processingTime}</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800">Generated</div>
                      <div className="text-green-600">
                        {new Date(result.metadata?.generatedAt || '').toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800">Methods</div>
                      <div className="text-green-600">
                        {result.metadata?.extractionMethods?.join(', ')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Recipes */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Real Extracted Recipes</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {result.mealPlan?.recipes.map((recipe: any, index: number) => (
                    <Card key={recipe.id} className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-start justify-between">
                          <span className="flex-1">{recipe.title}</span>
                          {recipe.sourceUrl && (
                            <a 
                              href={recipe.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </CardTitle>
                        <CardDescription>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              {recipe.cuisine}
                            </Badge>
                            {recipe.id.startsWith('scraped-') && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                Real Data Extracted
                              </Badge>
                            )}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${(recipe.metadata?.estimatedCost || 0).toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {recipe.metadata?.servings || 4} servings
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {recipe.metadata?.totalTimeMinutes || 30} min
                          </span>
                        </div>

                        {/* Real Ingredients */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Ingredients:</div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {(recipe.ingredients || []).slice(0, 6).map((ingredient: any, idx: number) => (
                              <div key={idx} className="text-xs flex justify-between items-start">
                                <span className="flex-1 pr-2">
                                  {ingredient.amount || 1} {ingredient.unit || 'piece'} {ingredient.name || 'Unknown ingredient'}
                                </span>
                                <span className="text-muted-foreground">
                                  ${(ingredient.estimatedCost || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {(recipe.ingredients || []).length > 6 && (
                              <div className="text-xs text-muted-foreground">
                                +{(recipe.ingredients || []).length - 6} more ingredients
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Real Instructions Preview */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Instructions Preview:</div>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {(recipe.instructions || []).slice(0, 2).map((instruction: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                <span className="font-medium">{instruction.step || idx + 1}.</span> {instruction.text || 'See source for instructions'}
                              </div>
                            ))}
                            {(recipe.instructions || []).length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{(recipe.instructions || []).length - 2} more steps
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={(recipe.culturalAuthenticity || 'high') === 'high' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {recipe.culturalAuthenticity || 'high'} authenticity
                          </Badge>
                          
                          {(recipe.budgetOptimized !== false) && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Budget Optimized
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Meal Plan Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {result.mealPlan?.recipes?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Recipes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${(result.mealPlan?.totalEstimatedCost || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {result.mealPlan?.confidence || 'medium'}
                      </div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {(result.mealPlan?.recipes || []).filter((r: any) => r.id?.startsWith('scraped-')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Real Extractions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  Pipeline Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{result.error}</p>
                <div className="mt-4 text-sm text-red-600">
                  <strong>Error Details:</strong>
                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                  <strong className="block mt-4">Troubleshooting:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>This endpoint doesn't require authentication</li>
                    <li>Check API keys: <a href="/api/debug/pipeline-status" target="_blank" className="text-blue-600 underline">Pipeline Status</a></li>
                    <li>Try simpler parameters (fewer meals, common cuisines)</li>
                    <li>Check browser console for network errors</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}