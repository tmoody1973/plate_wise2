/**
 * URL Validation Utility
 * Validates and sanitizes URLs, especially for recipe sources
 */

interface URLValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
  domain?: string;
}

class URLValidatorService {
  private trustedDomains = new Set([
    'allrecipes.com', 'food.com', 'epicurious.com', 'foodnetwork.com',
    'bonappetit.com', 'seriouseats.com', 'thekitchn.com', 'tasteofhome.com',
    'delish.com', 'cookinglight.com', 'eatingwell.com', 'myrecipes.com',
    'recipetineats.com', 'simplyrecipes.com', 'foodandwine.com',
    'taste.com.au', 'bbc.co.uk', 'jamieoliver.com', 'marthastewart.com'
  ]);

  /**
   * Validate a URL for recipe sources
   */
  validateURL(url: string | null | undefined): URLValidationResult {
    // Handle null/undefined
    if (!url || url.trim() === '') {
      return {
        isValid: false,
        error: 'URL is empty or undefined'
      };
    }

    let cleanUrl = url.trim();

    try {
      // Add protocol if missing
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const urlObj = new URL(cleanUrl);
      
      // Basic URL validation
      if (!urlObj.hostname) {
        return {
          isValid: false,
          error: 'Invalid URL format - no hostname'
        };
      }

      // Check for suspicious patterns
      if (this.hasSuspiciousPatterns(cleanUrl)) {
        return {
          isValid: false,
          error: 'URL contains suspicious patterns',
          domain: urlObj.hostname
        };
      }

      // Check if domain is trusted
      const domain = urlObj.hostname.replace(/^www\./, '');
      const isTrusted = this.trustedDomains.has(domain);

      if (!isTrusted) {
        console.warn(`⚠️ Untrusted domain for recipe URL: ${domain}`);
        // Allow but log warning for untrusted domains
      }

      // Sanitize the URL
      const sanitizedUrl = this.sanitizeURL(cleanUrl, urlObj);

      return {
        isValid: true,
        sanitizedUrl,
        domain
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        domain: undefined
      };
    }
  }

  /**
   * Validate multiple URLs and return only valid ones
   */
  validateURLs(urls: (string | null | undefined)[]): string[] {
    return urls
      .map(url => this.validateURL(url))
      .filter(result => result.isValid && result.sanitizedUrl)
      .map(result => result.sanitizedUrl!);
  }

  /**
   * Check if URL is from a trusted recipe domain
   */
  isTrustedDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      return this.trustedDomains.has(domain);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize URL by removing tracking parameters and normalizing
   */
  private sanitizeURL(url: string, urlObj: URL): string {
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'ref', 'source', 'campaign', 'medium'
    ];

    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    // Normalize the URL
    let sanitized = urlObj.toString();

    // Remove trailing slash if no path
    if (urlObj.pathname === '/' && !urlObj.search && !urlObj.hash) {
      sanitized = sanitized.replace(/\/$/, '');
    }

    return sanitized;
  }

  /**
   * Check for suspicious URL patterns
   */
  private hasSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /[<>{}]/,  // HTML/template characters
      /javascript:/i,  // Javascript protocol
      /data:/i,  // Data URLs
      /\s/,  // Whitespace in URL
      /[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/,  // Invalid URL characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Test if a URL is accessible (optional feature for critical validation)
   */
  async testURLAccessibility(url: string, timeoutMs = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'HEAD',  // Only get headers, not full content
        signal: controller.signal,
        headers: {
          'User-Agent': 'PlateWise Recipe Validator 1.0'
        }
      });

      clearTimeout(timeoutId);
      return response.ok && response.status < 400;

    } catch (error) {
      console.warn(`URL accessibility test failed for ${url}:`, error);
      return false;
    }
  }

  /**
   * Add a trusted domain (for dynamic updates)
   */
  addTrustedDomain(domain: string): void {
    this.trustedDomains.add(domain.replace(/^www\./, ''));
  }

  /**
   * Get list of trusted domains
   */
  getTrustedDomains(): string[] {
    return Array.from(this.trustedDomains);
  }
}

export const urlValidatorService = new URLValidatorService();
export type { URLValidationResult };