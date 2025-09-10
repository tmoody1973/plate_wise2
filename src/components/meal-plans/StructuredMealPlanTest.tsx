'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, DollarSign, Users, Globe } from 'lucide-react';

interface TestResult {
  success: boolean;
  data?: {
    mealPlan: any;
    performance: {
      generationTime: number;
      recipeCount: number;
      budgetUtilization: number;
    };
  };
  error?: string;
}

export function StructuredMealPlanTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/meal-plans/test-structured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
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
        <h1 className="text-3xl font-bold">Structured Perplexity Meal Plan Test</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the new structured JSON Schema output from Perplexity with cultural intelligence,
          store-aware ingredient matching, and cost optimization.
        </p>
        
        <Button 
          onClick={runTest} 
          disabled={isLoading}
          size="lg"
          className="min-w-[200px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Test Structured Generation'
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-6">
          {result.success ? (
            <>
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.data?.performance.generationTime}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Generation Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.data?.performance.recipeCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Recipes Generated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.data?.performance.budgetUtilization.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Budget Utilization</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Recipes */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Generated Recipes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.data?.mealPlan.recipes.map((recipe: any, index: number) => (
                    <Card key={recipe.id} className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">{recipe.title}</CardTitle>
                        <CardDescription>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.culturalOrigin.map((culture: string) => (
                              <Badge key={culture} variant="secondary" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {culture}
                              </Badge>
                            ))}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${recipe.metadata.estimatedCost.toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {recipe.metadata.servings} servings
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {recipe.metadata.totalTimeMinutes} min
                          </span>
                          <Badge 
                            variant={recipe.culturalAuthenticity === 'high' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {recipe.culturalAuthenticity} authenticity
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium">Key Ingredients:</div>
                          <div className="space-y-1">
                            {recipe.ingredients.slice(0, 3).map((ingredient: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                                <span>{ingredient.name}</span>
                                <span>${ingredient.estimatedCost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {recipe.budgetOptimized && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Budget Optimized
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Shopping Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Shopping Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold">
                        {result.data?.mealPlan.shoppingList.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        ${result.data?.mealPlan.totalEstimatedCost.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-600">
                        ${result.data?.mealPlan.savings.totalSavings.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Savings</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-purple-600">
                        {result.data?.mealPlan.confidence}
                      </div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cultural Balance */}
              <Card>
                <CardHeader>
                  <CardTitle>Cultural Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(result.data?.mealPlan.culturalBalance || {}).map(([cuisine, percentage]) => (
                      <div key={cuisine} className="flex items-center justify-between">
                        <span className="font-medium">{cuisine}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Test Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{result.error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}