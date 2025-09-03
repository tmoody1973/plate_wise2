'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface BudgetPeriod {
  id: string;
  userId: string;
  periodType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  budgetLimit: number;
  currentSpending: number;
  categories: {
    produce: number;
    meat: number;
    dairy: number;
    pantry: number;
    specialty: number;
  };
  alerts: any[];
  projectedSpending: number;
  savingsAchieved: number;
  createdAt: string;
  updatedAt: string;
}

interface BudgetTrackerProps {
  userId?: string;
}

export function BudgetTracker({ userId }: BudgetTrackerProps) {
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentBudget();
  }, [userId]);

  const fetchCurrentBudget = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/budget/current');
      
      if (!response.ok) {
        throw new Error('Failed to fetch budget');
      }

      const data = await response.json();
      setBudgetPeriod(data.budgetPeriod);
    } catch (err) {
      console.error('Error fetching budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading budget</span>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  if (!budgetPeriod) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Set</h3>
          <p className="text-gray-500">Set up your budget to start tracking your spending.</p>
        </div>
      </div>
    );
  }

  const spendingPercentage = (budgetPeriod.currentSpending / budgetPeriod.budgetLimit) * 100;
  const remainingBudget = budgetPeriod.budgetLimit - budgetPeriod.currentSpending;
  
  const getAlertLevel = () => {
    if (spendingPercentage >= 100) return 'over';
    if (spendingPercentage >= 90) return 'critical';
    if (spendingPercentage >= 75) return 'warning';
    return 'good';
  };

  const alertLevel = getAlertLevel();

  return (
    <div className="space-y-6">
      {/* Main Budget Overview */}
      <div className={`bg-white rounded-lg shadow border-l-4 ${
        alertLevel === 'over' ? 'border-l-red-500' :
        alertLevel === 'critical' ? 'border-l-orange-500' :
        alertLevel === 'warning' ? 'border-l-yellow-500' :
        'border-l-green-500'
      }`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Monthly Budget Tracker</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${budgetPeriod.currentSpending.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  of ${budgetPeriod.budgetLimit.toFixed(2)} budget
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(remainingBudget).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  {remainingBudget >= 0 ? 'remaining' : 'over budget'}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  alertLevel === 'over' ? 'bg-red-500' :
                  alertLevel === 'critical' ? 'bg-orange-500' :
                  alertLevel === 'warning' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-500">
              <span>0%</span>
              <span>{spendingPercentage.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      {alertLevel !== 'good' && (
        <div className={`rounded-lg border p-4 ${
          alertLevel === 'over' ? 'border-red-200 bg-red-50' :
          alertLevel === 'critical' ? 'border-orange-200 bg-orange-50' :
          'border-yellow-200 bg-yellow-50'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              {alertLevel === 'over' && (
                <p className="text-red-800">
                  You're ${Math.abs(remainingBudget).toFixed(2)} over your monthly budget. Consider cost-saving meal options.
                </p>
              )}
              {alertLevel === 'critical' && (
                <p className="text-orange-800">
                  You've used {spendingPercentage.toFixed(1)}% of your budget. Only ${remainingBudget.toFixed(2)} remaining.
                </p>
              )}
              {alertLevel === 'warning' && (
                <p className="text-yellow-800">
                  You've used {spendingPercentage.toFixed(1)}% of your budget. Consider budget-friendly recipes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Spending by Category</h3>
          </div>
          
          <div className="space-y-3">
            {Object.entries(budgetPeriod.categories).map(([category, amount]) => {
              const categoryPercentage = budgetPeriod.budgetLimit > 0 ? (amount / budgetPeriod.budgetLimit) * 100 : 0;
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <span className="text-sm text-gray-600">${amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(categoryPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Savings Achievement */}
      {budgetPeriod.savingsAchieved > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-800">Great job!</h4>
              <p className="text-green-700">
                You've saved ${budgetPeriod.savingsAchieved.toFixed(2)} this period through smart shopping.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}