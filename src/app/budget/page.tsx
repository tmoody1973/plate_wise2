"use client";

import { useEffect, useState } from 'react';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/AppLayout';

type LastTotal = { totalCost: number; estimatedItems: number; mode: 'package'|'proportional'; ts: number }

export default function BudgetPage() {
  const { profile, isLoading } = useProfileSetup()
  const [last, setLast] = useState<LastTotal | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mealplan-last-total')
      if (raw) setLast(JSON.parse(raw))
    } catch {}
  }, [])

  const weeklyBudget = profile?.budget?.monthlyLimit ? Math.round(profile.budget.monthlyLimit / 4) : 75
  const monthlyBudget = profile?.budget?.monthlyLimit || 300
  const lastUpdated = last?.ts ? new Date(last.ts).toLocaleString() : '—'

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Budget Overview</h1>
        <Link href="/meal-plans" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Meal Plans</Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Weekly Budget</div>
          <div className="text-2xl font-semibold">${weeklyBudget}</div>
          <div className="text-xs text-gray-500">Monthly: ${monthlyBudget}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Last Plan Total</div>
          <div className="text-2xl font-semibold">{last ? `$${last.totalCost.toFixed(2)}` : '—'}</div>
          <div className="text-xs text-gray-500">Updated: {lastUpdated}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Confidence</div>
          <div className="text-2xl font-semibold">{last ? (last.estimatedItems > 0 ? 'Medium' : 'High') : '—'}</div>
          {last && (
            <div className="text-xs text-gray-500">Estimated items: {last.estimatedItems} • Mode: {last.mode}</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Take Action</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>
            <Link href="/meal-plans" className="text-blue-600 hover:underline">Find Cheaper Swaps</Link>
            <span className="text-sm text-gray-500 ml-2">Scan your plan for lower per‑unit options.</span>
          </li>
          <li>
            <Link href="/meal-plans" className="text-blue-600 hover:underline">Fix Estimated Items</Link>
            <span className="text-sm text-gray-500 ml-2">Review items priced with default package sizes.</span>
          </li>
          <li>
            <Link href="/meal-plans" className="text-blue-600 hover:underline">Explain Total</Link>
            <span className="text-sm text-gray-500 ml-2">See top cost drivers and swap directly.</span>
          </li>
          <li>
            <Link href="/meal-plans" className="text-blue-600 hover:underline">Adjust Costing Mode</Link>
            <span className="text-sm text-gray-500 ml-2">Package vs Proportional.</span>
          </li>
        </ul>
      </div>

      {/* Coming soon / ideas */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Roadmap</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
          <li>History: weekly/monthly trend of spend vs budget</li>
          <li>Category breakdown: produce, meat, dairy, pantry</li>
          <li>Auto‑optimize plan to meet budget</li>
        </ul>
      </div>
      </div>
    </DashboardLayout>
  )
}
