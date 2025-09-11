'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CUISINES = ['mexican','japanese','indian','italian','haitian','brazilian','hmong','chinese','korean','vietnamese','greek','ethiopian'];
const CATEGORIES = [
  { value: 'main', label: 'Main Dish' },
  { value: 'soup_stew', label: 'Soups & Stews' },
  { value: 'salad', label: 'Salad' },
  { value: 'dessert', label: 'Sweet Treats' },
];

export default function PlannerV3Start() {
  const router = useRouter();
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(7);
  const [cuisines, setCuisines] = useState<string[]>(['mexican']);
  const [categories, setCategories] = useState<string[]>(['main']);
  const [budget, setBudget] = useState<'low'|'medium'|'comfortable'>('medium');
  const [diet, setDiet] = useState<string[]>([]);

  const weeklyBudget = budget === 'low' ? 60 : budget === 'medium' ? 100 : 160;

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x!==v) : [...arr, v];

  const startPlan = () => {
    const params = new URLSearchParams();
    params.set('culturalCuisines', cuisines.join(','));
    params.set('dishCategories', categories.join(','));
    params.set('householdSize', String(people));
    params.set('weeklyBudget', String(weeklyBudget));
    params.set('days', String(days));
    params.set('autofill', '1');
    if (diet.length) params.set('dietaryRestrictions', diet.join(','));
    router.push(`/meal-plans/plan?${params.toString()}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Plan My Week</h1>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-700 mb-2">Who’s eating?</div>
            <div className="flex gap-2">
              {[1,2,4,6].map(n => (
                <button key={n} className={`px-3 py-2 rounded border ${people===n?'bg-blue-600 text-white':'bg-white'}`} onClick={()=>setPeople(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-700 mb-2">How many days?</div>
            <div className="flex gap-2">
              {[3,5,7].map(n => (
                <button key={n} className={`px-3 py-2 rounded border ${days===n?'bg-blue-600 text-white':'bg-white'}`} onClick={()=>setDays(n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-700 mb-2">Cultural Cuisines</div>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map(c => (
              <button key={c} className={`px-3 py-2 rounded-full border text-sm capitalize ${cuisines.includes(c)?'bg-purple-600 text-white':'bg-white'}`} onClick={()=>setCuisines(toggle(cuisines,c))}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-700 mb-2">Dish Categories</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.value} className={`px-3 py-2 rounded-full border text-sm ${categories.includes(cat.value)?'bg-green-600 text-white':'bg-white'}`} onClick={()=>setCategories(toggle(categories,cat.value))}>{cat.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-700 mb-2">Budget</div>
          <div className="flex gap-2">
            {['low','medium','comfortable'].map((b:any) => (
              <button key={b} className={`px-3 py-2 rounded border capitalize ${budget===b?'bg-emerald-600 text-white':'bg-white'}`} onClick={()=>setBudget(b)}>{b}</button>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1">Weekly target: ${weeklyBudget}</div>
        </div>

        <div>
          <div className="text-sm text-gray-700 mb-2">Dietary Preferences</div>
          <div className="flex gap-2 flex-wrap text-sm">
            {['vegan','vegetarian','halal','kosher'].map(d => (
              <button key={d} className={`px-3 py-1.5 rounded-full border capitalize ${diet.includes(d)?'bg-amber-600 text-white':'bg-white'}`} onClick={()=>setDiet(toggle(diet,d))}>{d}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <a className="text-gray-600 hover:underline" href="/meal-plans">Switch to classic</a>
          <button className="px-5 py-2.5 rounded bg-blue-600 text-white" onClick={startPlan}>Create My Plan</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Explore a Culture</div>
            <div className="text-sm text-gray-600">Browse dishes and add a few to your week.</div>
          </div>
          <button className="px-4 py-2 rounded bg-purple-600 text-white" onClick={() => router.push('/meal-plans/plan?openSheet=suggestions')}>Explore</button>
        </div>
      </div>
    </div>
  );
}
