'use client';

import React, { Suspense } from 'react';
import PlannerV3 from '@/components/meal-plans/PlannerV3';
import PlannerV3Start from '@/components/meal-plans/PlannerV3Start';
import { useSearchParams } from 'next/navigation';

function PlannerV3PageContent() {
  const enabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PLANNER_V3 === 'true';
  const flag = (process.env.NEXT_PUBLIC_PLANNER_V3 || '').toString() === 'true';
  const search = useSearchParams();

  if (!(enabled || flag)) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Planner V3 is disabled</h1>
        <p className="text-gray-700 mb-4">Set NEXT_PUBLIC_PLANNER_V3=true to try the new planning experience.</p>
        <a className="text-blue-600 underline" href="/meal-plans">Back to classic planner</a>
      </div>
    );
  }

  // If no key params are present, show the guided start screen
  const hasCuisines = !!search.get('culturalCuisines');
  const step = search.get('step');
  const openSheet = search.get('openSheet');
  const autofill = search.get('autofill');
  if ((!hasCuisines && !openSheet && !autofill) || step === 'start') {
    return <PlannerV3Start />;
  }

  return <PlannerV3 />;
}

export default function PlannerV3Page() {
  return (
    <Suspense fallback={<div />}> 
      <PlannerV3PageContent />
    </Suspense>
  );
}
