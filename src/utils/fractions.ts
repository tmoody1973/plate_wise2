/**
 * Utility functions for converting decimal numbers to user-friendly fractions
 */

// Common cooking fractions
const COOKING_FRACTIONS: [number, string][] = [
  [0.125, '1/8'],
  [0.1666, '1/6'], 
  [0.25, '1/4'],
  [0.333, '1/3'],
  [0.375, '3/8'],
  [0.5, '1/2'],
  [0.625, '5/8'],
  [0.666, '2/3'],
  [0.75, '3/4'],
  [0.833, '5/6'],
  [0.875, '7/8'],
]

/**
 * Convert a decimal number to a mixed number with fractions
 * Examples: 1.5 → "1 1/2", 0.25 → "1/4", 2.33 → "2 1/3"
 */
export function toFraction(decimal: number, tolerance: number = 0.01): string {
  if (decimal === 0) return '0'
  if (decimal < 0) return `-${toFraction(-decimal, tolerance)}`
  
  // Extract whole number part
  const whole = Math.floor(decimal)
  const fractional = decimal - whole
  
  // If fractional part is negligible, return whole number
  if (Math.abs(fractional) < tolerance) {
    return whole === 0 ? '0' : whole.toString()
  }
  
  // Find closest cooking fraction
  let bestMatch = ''
  let smallestDiff = Infinity
  
  for (const [value, fraction] of COOKING_FRACTIONS) {
    const diff = Math.abs(fractional - value)
    if (diff < smallestDiff && diff <= tolerance * 2) {
      smallestDiff = diff
      bestMatch = fraction
    }
  }
  
  // If we found a good match, use it
  if (bestMatch) {
    if (whole === 0) return bestMatch
    return `${whole} ${bestMatch}`
  }
  
  // Fallback: convert to simple fraction using GCD
  const simpleFraction = decimalToSimpleFraction(fractional)
  if (simpleFraction) {
    if (whole === 0) return simpleFraction
    return `${whole} ${simpleFraction}`
  }
  
  // Last resort: round to nearest 1/8
  const eighths = Math.round(fractional * 8)
  if (eighths === 0) return whole.toString()
  if (eighths === 8) return (whole + 1).toString()
  
  const simplifiedEighths = simplifyFraction(eighths, 8)
  const fractionStr = `${simplifiedEighths.numerator}/${simplifiedEighths.denominator}`
  
  if (whole === 0) return fractionStr
  return `${whole} ${fractionStr}`
}

/**
 * Convert decimal to simple fraction with reasonable denominators
 */
function decimalToSimpleFraction(decimal: number): string | null {
  const maxDenominator = 32 // Limit to reasonable cooking denominators
  
  for (let denominator = 2; denominator <= maxDenominator; denominator++) {
    const numerator = Math.round(decimal * denominator)
    const reconstructed = numerator / denominator
    
    if (Math.abs(decimal - reconstructed) < 0.01) {
      if (numerator === 0) return null
      if (numerator === denominator) return null // This would be 1
      
      const simplified = simplifyFraction(numerator, denominator)
      return `${simplified.numerator}/${simplified.denominator}`
    }
  }
  
  return null
}

/**
 * Simplify a fraction by finding GCD
 */
function simplifyFraction(numerator: number, denominator: number): { numerator: number; denominator: number } {
  const gcd = findGCD(numerator, denominator)
  return {
    numerator: numerator / gcd,
    denominator: denominator / gcd
  }
}

/**
 * Find Greatest Common Divisor
 */
function findGCD(a: number, b: number): number {
  return b === 0 ? a : findGCD(b, a % b)
}

/**
 * Format ingredient amount with fraction conversion
 * Examples: formatIngredientAmount(1.5, "cups") → "1 1/2 cups"
 */
export function formatIngredientAmount(amount: number, unit: string): string {
  const fractionStr = toFraction(amount)
  
  // Handle singular/plural units
  let displayUnit = unit
  if (amount === 1 || fractionStr === '1') {
    // Convert plural to singular for amount of 1
    if (unit.endsWith('s') && !unit.endsWith('ss')) {
      displayUnit = unit.slice(0, -1)
    }
  } else {
    // Ensure plural for other amounts
    if (!unit.endsWith('s') && !unit.endsWith('ss') && unit !== 'each') {
      displayUnit = unit + 's'
    }
  }
  
  return `${fractionStr} ${displayUnit}`.trim()
}

/**
 * Test the fraction conversion with common cooking measurements
 */
export function testFractions() {
  const tests = [
    0.125, 0.25, 0.33, 0.5, 0.66, 0.75, 0.875,
    1.25, 1.5, 1.75, 2.33, 2.5, 3.125, 4.66
  ]
  
  console.log('Fraction conversion tests:')
  tests.forEach(num => {
    console.log(`${num} → ${toFraction(num)}`)
  })
}