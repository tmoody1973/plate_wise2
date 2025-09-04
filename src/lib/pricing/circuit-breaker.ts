/**
 * Circuit Breaker Pattern for API Reliability
 * Prevents cascading failures and provides fast fallback for pricing APIs
 */

type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export type CircuitBreakerOptions = {
  failureThreshold: number // Number of failures before opening
  timeout: number // Time to wait before attempting half-open (ms)
  monitoringPeriod: number // Time window for failure counting (ms)
  successThreshold: number // Successes needed in half-open to close
}

export type CircuitBreakerStats = {
  state: CircuitBreakerState
  failures: number
  successes: number
  lastFailure?: Date
  lastSuccess?: Date
  nextAttempt?: Date
}

class CircuitBreaker {
  private state: CircuitBreakerState = 'closed'
  private failures = 0
  private successes = 0
  private lastFailure?: Date
  private lastSuccess?: Date
  private nextAttempt?: Date
  private recentFailures: Date[] = []

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open'
        console.log(`🔄 Circuit breaker ${this.name}: attempting reset (half-open)`)
      } else {
        const error = new Error(`Circuit breaker ${this.name} is open`)
        error.name = 'CircuitBreakerOpenError'
        throw error
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Check if a function can be executed (without executing it)
   */
  canExecute(): boolean {
    if (this.state === 'closed') return true
    if (this.state === 'half-open') return true
    return this.shouldAttemptReset()
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextAttempt: this.nextAttempt
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.successes = 0
    this.recentFailures = []
    this.nextAttempt = undefined
    console.log(`🔄 Circuit breaker ${this.name}: manually reset`)
  }

  private onSuccess(): void {
    this.successes++
    this.lastSuccess = new Date()

    if (this.state === 'half-open') {
      if (this.successes >= this.options.successThreshold) {
        this.state = 'closed'
        this.failures = 0
        this.recentFailures = []
        console.log(`✅ Circuit breaker ${this.name}: closed (recovered)`)
      }
    } else if (this.state === 'closed') {
      // Reset failure count on successful execution in closed state
      this.cleanupOldFailures()
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailure = new Date()
    this.recentFailures.push(new Date())

    // Clean up old failures outside monitoring period
    this.cleanupOldFailures()

    if (this.state === 'half-open') {
      // Any failure in half-open goes back to open
      this.state = 'open'
      this.nextAttempt = new Date(Date.now() + this.options.timeout)
      console.log(`❌ Circuit breaker ${this.name}: opened (half-open failure)`)
    } else if (this.state === 'closed') {
      // Check if we should open the circuit
      if (this.recentFailures.length >= this.options.failureThreshold) {
        this.state = 'open'
        this.nextAttempt = new Date(Date.now() + this.options.timeout)
        console.log(`❌ Circuit breaker ${this.name}: opened (${this.recentFailures.length} failures)`)
      }
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttempt ? new Date() >= this.nextAttempt : false
  }

  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.options.monitoringPeriod
    this.recentFailures = this.recentFailures.filter(failure => 
      failure.getTime() > cutoff
    )
  }
}

/**
 * Circuit Breaker Manager for different API services
 */
class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>()

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 3, // Open after 3 failures
        timeout: 30000, // Wait 30s before retry
        monitoringPeriod: 60000, // Monitor failures in 1min window
        successThreshold: 2 // Need 2 successes to close
      }

      const finalOptions = { ...defaultOptions, ...options }
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, finalOptions))
    }

    return this.breakers.get(serviceName)!
  }

  /**
   * Get stats for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats()
    }

    return stats
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }
}

// Global circuit breaker manager
export const circuitBreakerManager = new CircuitBreakerManager()

// Pre-configured circuit breakers for pricing services
export const pricingCircuitBreakers = {
  perplexity: circuitBreakerManager.getBreaker('perplexity-pricing', {
    failureThreshold: 2, // Open quickly for slow API
    timeout: 60000, // Wait 1 minute before retry
    monitoringPeriod: 120000, // 2 minute window
    successThreshold: 1 // Close quickly on success
  }),

  kroger: circuitBreakerManager.getBreaker('kroger-api', {
    failureThreshold: 5, // More tolerant
    timeout: 15000, // Shorter retry period
    monitoringPeriod: 60000,
    successThreshold: 2
  }),

  usda: circuitBreakerManager.getBreaker('usda-api', {
    failureThreshold: 3,
    timeout: 30000,
    monitoringPeriod: 60000,
    successThreshold: 1
  })
}

/**
 * Utility function to wrap any async function with circuit breaker
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options?: Partial<CircuitBreakerOptions>
): Promise<T> {
  const breaker = circuitBreakerManager.getBreaker(serviceName, options)
  return breaker.execute(fn)
}