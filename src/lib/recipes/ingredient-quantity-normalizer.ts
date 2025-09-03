/**
 * Recipe-aware ingredient quantity normalizer
 * Calculates accurate portion costs based on actual recipe needs vs package sizes
 */

import { calculatePortionCost, parseEnhancedPackageSize, normalizeUnit } from '@/utils/units'

export interface RecipeIngredient {
  id?: string
  name: string
  amount: number
  unit: string
}

export interface PackageInfo {
  productName: string
  packageSize: string
  packagePrice: number
  storeName: string
  storeAddress?: string
  unitPrice?: number | string
  storeType?: string
  sourceUrl?: string
}

export interface PortionCalculationResult {
  ingredient: string
  packagePrice: number
  portionCost: number
  utilizationRatio: number
  wasteAmount: number
  wasteUnit: string
  isWholePortion: boolean
  confidence: 'high' | 'medium' | 'low'
  explanation?: string
}

/**
 * Smart ingredient quantity normalizer with recipe context
 */
export class IngredientQuantityNormalizer {
  
  /**
   * Calculate accurate portion cost for an ingredient
   */
  calculateIngredientPortion(
    recipeIngredient: RecipeIngredient, 
    packageInfo: PackageInfo
  ): PortionCalculationResult {
    
    // Parse package size
    const parsedPackage = parseEnhancedPackageSize(packageInfo.packageSize)
    
    if (!parsedPackage) {
      // Fallback when package size can't be parsed
      return this.createFallbackResult(recipeIngredient, packageInfo, 'low', 
        'Could not parse package size - using estimated portion')
    }

    // Handle special cases first
    if (this.isWholeIngredient(recipeIngredient.name, recipeIngredient.unit)) {
      return this.handleWholeIngredient(recipeIngredient, packageInfo, parsedPackage)
    }

    // Calculate portion using unit conversion
    const result = calculatePortionCost({
      recipeQuantity: recipeIngredient.amount,
      recipeUnit: recipeIngredient.unit,
      packageSize: parsedPackage.amount,
      packageUnit: parsedPackage.unit,
      packagePrice: packageInfo.packagePrice
    })

    // Determine confidence level
    const confidence = this.determineConfidence(
      recipeIngredient.unit, 
      parsedPackage.unit, 
      result.utilizationRatio
    )

    return {
      ingredient: recipeIngredient.name,
      packagePrice: packageInfo.packagePrice,
      portionCost: Math.round(result.portionCost * 100) / 100, // Round to cents
      utilizationRatio: result.utilizationRatio,
      wasteAmount: Math.round(result.wasteAmount * 100) / 100,
      wasteUnit: parsedPackage.unit,
      isWholePortion: result.utilizationRatio >= 0.95,
      confidence,
      explanation: this.generateExplanation(recipeIngredient, parsedPackage, result)
    }
  }

  /**
   * Check if ingredient represents a whole item (chicken, onion, etc)
   */
  private isWholeIngredient(ingredientName: string, unit: string): boolean {
    const wholeIngredientPatterns = [
      /whole\s+(chicken|turkey|fish|onion|garlic)/i,
      /^(chicken|turkey|fish|onion|garlic)\s*,?\s*(cut|chopped|diced)?/i,
    ]

    const wholeUnits = ['whole', 'piece', 'pieces', 'each', '', 'item', 'items']
    
    return wholeIngredientPatterns.some(pattern => pattern.test(ingredientName)) ||
           wholeUnits.includes(unit.toLowerCase().trim())
  }

  /**
   * Handle ingredients that are typically purchased/used whole
   */
  private handleWholeIngredient(
    recipeIngredient: RecipeIngredient,
    packageInfo: PackageInfo,
    parsedPackage: { amount: number; unit: string }
  ): PortionCalculationResult {
    
    const recipeAmount = recipeIngredient.amount || 1
    const packageAmount = parsedPackage.amount || 1
    
    // For whole items, if recipe needs 1 and package contains 1, use full price
    if (recipeAmount <= packageAmount) {
      const utilizationRatio = recipeAmount / packageAmount
      const portionCost = packageInfo.packagePrice * utilizationRatio
      
      return {
        ingredient: recipeIngredient.name,
        packagePrice: packageInfo.packagePrice,
        portionCost: Math.round(portionCost * 100) / 100,
        utilizationRatio,
        wasteAmount: packageAmount - recipeAmount,
        wasteUnit: 'piece',
        isWholePortion: recipeAmount === packageAmount,
        confidence: 'high',
        explanation: `Recipe uses ${recipeAmount} of ${packageAmount} in package`
      }
    }

    // If recipe needs more than package contains, still charge full package price
    return {
      ingredient: recipeIngredient.name,
      packagePrice: packageInfo.packagePrice,
      portionCost: packageInfo.packagePrice,
      utilizationRatio: 1,
      wasteAmount: 0,
      wasteUnit: 'piece',
      isWholePortion: true,
      confidence: 'medium',
      explanation: `Recipe needs more than package contains - using full package price`
    }
  }

  /**
   * Determine confidence level based on unit compatibility and utilization
   */
  private determineConfidence(
    recipeUnit: string, 
    packageUnit: string, 
    utilizationRatio: number
  ): 'high' | 'medium' | 'low' {
    
    const normalizedRecipeUnit = normalizeUnit(recipeUnit)
    const normalizedPackageUnit = normalizeUnit(packageUnit)
    
    // High confidence: compatible units and reasonable utilization
    if (normalizedRecipeUnit && normalizedPackageUnit && 
        utilizationRatio > 0.05 && utilizationRatio <= 1) {
      return 'high'
    }
    
    // Medium confidence: reasonable utilization but unit mismatch
    if (utilizationRatio > 0.05 && utilizationRatio <= 1) {
      return 'medium'
    }
    
    // Low confidence: unreasonable utilization or unit issues
    return 'low'
  }

  /**
   * Generate human-readable explanation of the calculation
   */
  private generateExplanation(
    recipeIngredient: RecipeIngredient,
    parsedPackage: { amount: number; unit: string },
    result: { utilizationRatio: number; portionCost: number }
  ): string {
    
    const recipeAmount = recipeIngredient.amount
    const recipeUnit = recipeIngredient.unit || 'unit'
    const packageAmount = parsedPackage.amount
    const packageUnit = parsedPackage.unit || 'unit'
    
    const utilizationPercent = Math.round(result.utilizationRatio * 100)
    
    if (recipeUnit === packageUnit || normalizeUnit(recipeUnit) === normalizeUnit(packageUnit)) {
      return `Recipe needs ${recipeAmount} ${recipeUnit}, package contains ${packageAmount} ${packageUnit} (${utilizationPercent}% used)`
    }
    
    return `Recipe needs ${recipeAmount} ${recipeUnit} from ${packageAmount} ${packageUnit} package (${utilizationPercent}% estimated usage)`
  }

  /**
   * Create fallback result when calculation fails
   */
  private createFallbackResult(
    recipeIngredient: RecipeIngredient,
    packageInfo: PackageInfo,
    confidence: 'high' | 'medium' | 'low',
    explanation: string
  ): PortionCalculationResult {
    
    // Use conservative 30% estimate for fallback
    const fallbackRatio = 0.30
    const portionCost = packageInfo.packagePrice * fallbackRatio
    
    return {
      ingredient: recipeIngredient.name,
      packagePrice: packageInfo.packagePrice,
      portionCost: Math.round(portionCost * 100) / 100,
      utilizationRatio: fallbackRatio,
      wasteAmount: 0,
      wasteUnit: 'unit',
      isWholePortion: false,
      confidence,
      explanation
    }
  }

  /**
   * Batch process multiple ingredients
   */
  calculateBatch(
    recipeIngredients: RecipeIngredient[],
    packageInfoMap: Record<string, PackageInfo>
  ): PortionCalculationResult[] {
    
    return recipeIngredients.map(ingredient => {
      const packageInfo = packageInfoMap[ingredient.name.toLowerCase()]
      
      if (!packageInfo) {
        return this.createFallbackResult(
          ingredient, 
          {
            productName: 'Unknown Product',
            packageSize: '1 unit',
            packagePrice: 5, // Default estimate
            storeName: 'Unknown Store'
          },
          'low',
          'No package information available'
        )
      }
      
      return this.calculateIngredientPortion(ingredient, packageInfo)
    })
  }

  /**
   * Calculate total recipe cost from portion results
   */
  calculateTotalCost(results: PortionCalculationResult[]): {
    totalPackageCost: number
    totalPortionCost: number
    averageUtilization: number
    totalWasteValue: number
  } {
    
    const totalPackageCost = results.reduce((sum, r) => sum + r.packagePrice, 0)
    const totalPortionCost = results.reduce((sum, r) => sum + r.portionCost, 0)
    const totalWasteValue = results.reduce((sum, r) => sum + (r.packagePrice - r.portionCost), 0)
    
    const averageUtilization = results.length > 0 
      ? results.reduce((sum, r) => sum + r.utilizationRatio, 0) / results.length
      : 0
    
    return {
      totalPackageCost: Math.round(totalPackageCost * 100) / 100,
      totalPortionCost: Math.round(totalPortionCost * 100) / 100,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
      totalWasteValue: Math.round(totalWasteValue * 100) / 100
    }
  }
}

// Export singleton instance
export const ingredientQuantityNormalizer = new IngredientQuantityNormalizer()