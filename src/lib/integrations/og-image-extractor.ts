/**
 * Open Graph Image Extractor
 * Fetches og:image, twitter:image, and other meta images from recipe URLs
 */

interface OGImageData {
  ogImage?: string;
  twitterImage?: string;
  title?: string;
  description?: string;
  siteName?: string;
  bestImage?: string;
}

export class OGImageExtractor {
  private cache = new Map<string, OGImageData>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Extract Open Graph and Twitter Card images from a URL
   */
  async extractOGImage(url: string): Promise<OGImageData> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    try {
      console.log(`🖼️ Extracting OG image for: ${url}`);

      // Fetch the HTML content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const ogData = this.parseMetaTags(html, url);

      // Cache the result
      this.cache.set(url, ogData);

      console.log(`✅ OG image extracted:`, {
        url,
        hasOGImage: !!ogData.ogImage,
        hasTwitterImage: !!ogData.twitterImage,
        bestImage: ogData.bestImage
      });

      return ogData;

    } catch (error) {
      console.error(`❌ Failed to extract OG image from ${url}:`, error);
      
      // Return empty data but cache it to avoid repeated failures
      const emptyData: OGImageData = {};
      this.cache.set(url, emptyData);
      return emptyData;
    }
  }

  /**
   * Parse meta tags from HTML content
   */
  private parseMetaTags(html: string, baseUrl: string): OGImageData {
    const ogData: OGImageData = {};

    // Extract Open Graph image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (ogImageMatch) {
      ogData.ogImage = this.resolveUrl(ogImageMatch[1], baseUrl);
    }

    // Extract Twitter Card image
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (twitterImageMatch) {
      ogData.twitterImage = this.resolveUrl(twitterImageMatch[1], baseUrl);
    }

    // Alternative Twitter image property
    const twitterImageSrcMatch = html.match(/<meta[^>]*property=["']twitter:image:src["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (twitterImageSrcMatch && !ogData.twitterImage) {
      ogData.twitterImage = this.resolveUrl(twitterImageSrcMatch[1], baseUrl);
    }

    // Extract title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (ogTitleMatch) {
      ogData.title = ogTitleMatch[1];
    }

    // Extract description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (ogDescMatch) {
      ogData.description = ogDescMatch[1];
    }

    // Extract site name
    const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (siteNameMatch) {
      ogData.siteName = siteNameMatch[1];
    }

    // Determine the best image to use
    ogData.bestImage = ogData.ogImage || ogData.twitterImage;

    return ogData;
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    try {
      const base = new URL(baseUrl);
      if (url.startsWith('//')) {
        return `${base.protocol}${url}`;
      }
      if (url.startsWith('/')) {
        return `${base.protocol}//${base.host}${url}`;
      }
      return new URL(url, baseUrl).href;
    } catch (error) {
      console.warn(`Failed to resolve URL: ${url} with base: ${baseUrl}`);
      return url;
    }
  }

  /**
   * Extract multiple OG images in parallel
   */
  async extractMultipleOGImages(urls: string[]): Promise<Map<string, OGImageData>> {
    const results = new Map<string, OGImageData>();
    
    // Process URLs in batches to avoid overwhelming servers
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(async (url) => {
        const ogData = await this.extractOGImage(url);
        return { url, ogData };
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.url, result.value.ogData);
        }
      }

      // Small delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Clear expired cache entries
   */
  cleanup() {
    // For now, just clear the entire cache periodically
    // In production, you'd want to track timestamps
    if (this.cache.size > 100) {
      this.cache.clear();
      console.log('🧹 Cleared OG image cache');
    }
  }
}

export const ogImageExtractor = new OGImageExtractor();

// Cleanup cache periodically
setInterval(() => {
  ogImageExtractor.cleanup();
}, 60 * 60 * 1000); // Every hour