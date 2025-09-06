const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // Fix Webpack filesystem cache race condition
  webpack: (config) => {
    if (isDev) {
      // Avoid filesystem cache in dev to prevent ENOENT rename issues
      config.cache = { type: 'memory' };
    } else {
      // Keep default (filesystem) cache for production builds
      // If you still see issues in CI, you can also set config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'spoonacular.com',
        port: '',
        pathname: '/recipeImages/**',
      },
      {
        protocol: 'https',
        hostname: 'img.spoonacular.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // Food Network images
      {
        protocol: 'https',
        hostname: 'food.fnr.sndimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.foodnetwork.com',
        port: '',
        pathname: '/**',
      },
      // The Kitchn images
      {
        protocol: 'https',
        hostname: 'cdn.apartmenttherapy.info',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.thekitchn.com',
        port: '',
        pathname: '/**',
      },
      // AllRecipes images
      {
        protocol: 'https',
        hostname: 'www.allrecipes.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imagesvc.meredithcorp.io',
        port: '',
        pathname: '/**',
      },
      // Serious Eats images
      {
        protocol: 'https',
        hostname: 'www.seriouseats.com',
        port: '',
        pathname: '/**',
      },
      // Bon Appetit images
      {
        protocol: 'https',
        hostname: 'assets.bonappetit.com',
        port: '',
        pathname: '/**',
      },
      // Epicurious images
      {
        protocol: 'https',
        hostname: 'assets.epicurious.com',
        port: '',
        pathname: '/**',
      },
      // Whats4eats.com for global recipes
      {
        protocol: 'https',
        hostname: 'www.whats4eats.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'whats4eats.com',
        port: '',
        pathname: '/**',
      },
      // Generic CDN patterns for recipe sites
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.wp.com',
        port: '',
        pathname: '/**',
      },
      // Google Maps and Places API images
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/maps/api/place/photo/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: 'platewise-app',
  },
  // Enable source maps in production for better debugging
  productionBrowserSourceMaps: true,
  
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Security headers
  async headers() {
    return [
      // Do not apply security headers to Next.js internal assets to avoid MIME issues during dev
      {
        source: '/((?!_next/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
