/**
 * Debug Page
 * Temporary page for debugging recipe issues
 */

import { RecipeDebug } from '@/components/debug/RecipeDebug';
import EnhancedCulturalPricingTest from '@/components/debug/EnhancedCulturalPricingTest';

export default function DebugPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Enhanced Cultural Pricing Test</h2>
          <EnhancedCulturalPricingTest />
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4">Recipe Debug</h2>
          <RecipeDebug />
        </section>
      </div>
    </div>
  );
}