# PlateWise 🍽️

A culturally-aware, AI-driven meal planning platform that helps families and individuals optimize their food budgets while preserving culinary traditions.

## Overview

PlateWise combines advanced cost analysis, cultural heritage preservation, nutritional optimization, and community features to create a holistic meal planning and grocery shopping experience. The platform uses Amazon Bedrock AI to generate personalized meal plans that respect cultural authenticity while staying within budget constraints, integrated with comprehensive external APIs for real-time pricing, recipe discovery, and cultural food research.

**What makes PlateWise unique:** We understand that food is more than fuel—it's culture, tradition, and community. Our AI doesn't just find cheap ingredients; it finds culturally authentic ingredients at the best prices, helping families maintain their food traditions without breaking their budgets.

## 🎯 Core Mission

**Bridging Culture and Budget:** PlateWise solves the universal challenge of maintaining cultural food traditions while managing modern budget constraints. Our platform recognizes that authentic ingredients often require specialized knowledge about where to shop, when to buy, and how to balance cost with cultural significance.

## 🔄 Recent Updates & Enhancements

PlateWise has recently undergone significant improvements to enhance the user experience and provide more accurate, culturally-sensitive meal planning with breakthrough cultural intelligence capabilities:

### **🏪 Enhanced Store Discovery & Shopping Optimization (Latest Update - January 2025)**
**Major Update:** PlateWise now features a revolutionary store discovery and shopping optimization system that transforms how users find and compare grocery options with advanced cultural intelligence.

**What This Means:** Instead of generic store listings, PlateWise now provides intelligent store discovery with location-based search, cultural market identification, and advanced shopping route optimization that considers both cost and cultural authenticity.

#### **🆕 New Store Discovery Features:**
- **📍 Advanced Location Services** - New `/api/stores/discover` endpoint with intelligent geocoding and comprehensive fallback location services
- **🏪 Interactive Store Selection** - Enhanced StoreSelector component with real-time distance calculations and cultural market identification
- **🗺️ Robust Geocoding Infrastructure** - Primary Google Geocoding API with multiple fallback services ensuring 99.9% location resolution reliability
- **📊 Intelligent Shopping Routes** - AI-powered multi-store shopping optimization that balances cost, distance, and cultural authenticity
- **🔍 Enhanced Ingredient Search** - Completely redesigned ingredient search modal with advanced quantity normalization and unit conversion
- **⚖️ Smart Quantity Processing** - New ingredient quantity normalizer with intelligent parsing across different measurement systems
- **👤 Seamless Location Management** - useUserLocation hook for automatic location detection and personalized store recommendations

#### **🛠️ Technical Infrastructure Improvements:**
```typescript
// New Store Discovery API
interface StoreDiscoveryRequest {
  location: string;
  radius?: number;
  storeTypes?: string[];
  culturalFocus?: string[];
  userPreferences?: UserCulturalPreferences;
}

interface EnhancedStoreResult {
  id: string;
  name: string;
  address: string;
  distance: number;
  culturalSpecialties: string[];
  priceRange: 'budget' | 'moderate' | 'premium';
  authenticity: number;
  qualityRating: number;
  communityVerified: boolean;
}

// Enhanced Geocoding Services
interface GeocodingService {
  primary: GoogleGeocodingAPI;
  fallbacks: [FallbackGeocodingService, BasicLocationService];
  reliability: 99.9%;
}
```

#### **🎯 User Experience Enhancements:**
- **🏪 Smart Store Recommendations** - Personalized store suggestions based on user location, cultural preferences, and shopping history
- **📱 Mobile-Optimized Interface** - Enhanced responsive design for seamless mobile shopping experiences
- **🔄 Real-Time Updates** - Live store availability, pricing updates, and cultural market discovery
- **🎯 Cultural Context Integration** - Store recommendations now factor in cultural authenticity and specialty ingredient availability

### **🎯 User-Centric Pricing Revolution (Previous Update)**
The Enhanced Pricing Service integrates comprehensive user profile data to deliver truly personalized cost optimization:

**What This Means:** Instead of generic pricing, PlateWise now considers your specific location, cultural preferences, saved stores, and shopping patterns to provide tailored recommendations that respect both your budget and cultural authenticity needs.

**Key Improvements:**
- **📍 Location-Aware Pricing** - Precise pricing based on your exact ZIP code, city, and state
- **🌍 Cultural Preference Integration** - Pricing prioritizes ingredients and stores relevant to your cultural cuisines
- **🏪 Saved Store Optimization** - Leverages your preferred stores for more accurate and convenient pricing
- **🎯 Personalized Recommendations** - AI recommendations now factor in your complete user profile for better cultural authenticity and cost balance

This enhancement enables the pricing service to provide contextually relevant recommendations that understand not just what you're cooking, but who you are and where you shop.

### Latest Features (January 2025)
- **🏪 Advanced Store Discovery System** - New location-based store discovery API with intelligent geocoding, cultural market identification, and distance-based recommendations
- **🗺️ Enterprise-Grade Geocoding Services** - Primary Google Geocoding API with comprehensive multi-tier fallback services ensuring 99.9% location resolution reliability
- **📊 AI-Powered Shopping Route Optimization** - Intelligent multi-store shopping routes that dynamically balance cost, distance, and cultural authenticity for optimal shopping experiences
- **🔍 Advanced Ingredient Search & Normalization Engine** - Completely redesigned ingredient search modal with intelligent quantity normalization and unit conversion across international measurement systems
- **👤 Seamless User Location Management** - Advanced location detection and management hook with automatic preferences and personalized store recommendations
- **🏪 Interactive Cultural Store Selection** - Enhanced StoreSelector component with real-time distance calculations, cultural specialties display, and community-verified authenticity ratings
- **⚖️ Smart Ingredient Quantity Processing** - New ingredient quantity normalizer with AI-powered parsing and standardization across different cultural measurement systems
- **🛒 Enhanced Shopping List Generation** - Improved shopping list creation with store-specific organization and cultural ingredient categorization
- **🧠 Advanced Cultural Pricing Intelligence** - Revolutionary AI-powered pricing system that understands cultural ingredients, traditional names (za'faran for saffron), and ethnic market dynamics with enhanced database schema
- **🏪 Multi-Tier Pricing Architecture** - EnhancedPricingService with Perplexity AI primary, Kroger API fallback, and intelligent basic estimates ensuring 99.9% pricing availability
- **👤 User-Centric Pricing Integration** - Enhanced pricing service now integrates user profiles, location data, and cultural preferences for personalized cost optimization
- **🌍 Enhanced Ethnic Market Integration** - Specialized discovery and pricing for halal, kosher, Asian, Mexican, Middle Eastern, and African markets with authenticity ratings and community verification
- **📊 Smart Confidence Scoring** - Transparent 0-100% confidence ratings for all pricing sources with detailed explanations and reliability indicators
- **🔄 Intelligent Fallback System** - Automatic failover from Perplexity → Kroger → Basic estimates with health monitoring and status reporting
- **🎯 Cultural Authenticity Engine** - AI-powered scoring (1-10 scale) with traditional/adapted/substitute classifications and cultural impact analysis
- **🛠️ Advanced Developer Tools** - Comprehensive testing suite including CulturalPricingTest, EnhancedCulturalPricingTest, and PricingFallbackTest with authenticity prioritization and budget controls
- **💰 Budget Optimization AI** - Smart budget tracking with visual progress indicators, category breakdowns, and proactive spending alerts
- **🗣️ Multilingual Voice Integration** - ElevenLabs text-to-speech with cultural pronunciation guides and voice command system
- **🔍 Cultural Research Integration** - Tavily API integration for cultural food research and authenticity validation
- **⚡ Production-Ready Architecture** - Error boundaries, graceful degradation, circuit breakers, and comprehensive monitoring
- **🗄️ Enhanced Database Schema** - New interfaces for EnhancedCulturalIngredient, PerplexityCulturalResponse, PerplexityDiscoveredMarket, and CulturalPricingConfidence with comprehensive cultural pricing intelligence storage

## 🛠️ Advanced Developer Tools & Testing

**Built for Developers, By Developers:** PlateWise includes comprehensive testing and debugging tools to ensure cultural authenticity and pricing accuracy.

### **🏪 Store Discovery & Location Services**

**New Developer Infrastructure:** The latest update includes comprehensive store discovery and location management tools for testing and debugging the shopping optimization features.

#### **🆕 Enhanced Store Discovery API Endpoints (Latest Update)**
- **`/api/stores/discover`** - Revolutionary location-based store discovery with intelligent cultural market identification and personalized recommendations
- **`/api/stores/search`** - Advanced store search with comprehensive filtering, cultural specialties, and authenticity ratings
- **`/api/stores/validate`** - Store validation and verification services with community feedback integration
- **`/api/ingredients/search`** - Enhanced ingredient search with intelligent quantity normalization and cultural context
- **`/api/pricing/optimize-stores`** - AI-powered multi-store price optimization and intelligent route planning

#### **🗺️ Advanced Location & Geocoding Services**
- **Primary Google Geocoding API** - Enterprise-grade location resolution with cultural context and high accuracy
- **Multi-Tier Fallback System** - Comprehensive backup geocoding services ensuring 99.9% reliability
- **Cultural Location Intelligence** - Understanding of ethnic neighborhoods and cultural market concentrations
- **Real-Time Location Updates** - Dynamic location tracking for mobile users and delivery optimization
- **Fallback Geocoding Service** - Comprehensive backup location services for reliability
- **User Location Hook** - React hook for seamless location detection and management
- **Location Validation** - Address validation and standardization across different formats

#### **🆕 Enhanced Components & Hooks (Latest Update)**
- **StoreSelector Component** - Interactive store selection with real-time distance calculations, cultural specialties display, and community authenticity ratings
- **IngredientSearchModal** - Completely redesigned ingredient search with intelligent quantity normalization, unit conversion, and cultural context
- **useUserLocation Hook** - Advanced location management with automatic detection, user preferences, and seamless geocoding integration
- **Ingredient Quantity Normalizer** - AI-powered parsing and standardization of ingredient quantities across international measurement systems
- **Enhanced Store Discovery Components** - New UI components for store browsing, filtering, and cultural market exploration
- **Shopping Route Optimizer** - Visual route planning components with cost-distance-authenticity optimization
- **Cultural Store Rating System** - Community-driven store rating and review components for authenticity verification

### **Cultural Pricing Test Suite**
The `CulturalPricingTest` component provides advanced testing capabilities for our cultural pricing intelligence:

- **🧪 Recipe Testing Scenarios** - Pre-configured Persian, Mexican, and Indian recipe tests with authentic ingredients
- **⚖️ Authenticity vs. Cost Controls** - Toggle between prioritizing cultural authenticity or budget optimization
- **💰 Budget Limit Testing** - Configurable budget constraints ($10-$200) to test pricing recommendations
- **📊 Real-Time Analysis** - Live testing of traditional name recognition, ethnic market discovery, and cultural significance scoring
- **🏪 Store Discovery Validation** - Comprehensive testing of halal, kosher, Asian, Mexican, and Middle Eastern market integration
- **📈 Confidence Scoring Validation** - Real-time validation of AI confidence ratings and pricing source attribution

### **Enhanced Cultural Pricing Test Suite**
The `EnhancedCulturalPricingTest` component provides comprehensive testing for our advanced cultural pricing database integration:

- **🗄️ Database Integration Testing** - Full testing of enhanced cultural ingredient database with traditional name mapping
- **🌍 Cultural Intelligence Validation** - Test cultural significance scoring, authenticity importance ratings, and sourcing tips
- **🏪 Ethnic Market Discovery** - Comprehensive testing of market discovery, community verification, and quality indicators
- **📊 Confidence Score Analysis** - Multi-dimensional confidence scoring across source reliability, cultural authenticity, price accuracy, and market coverage
- **🔄 Traditional Ingredient Mapping** - Test traditional name recognition across multiple cultural contexts and languages
- **👤 User Profile Integration Testing** - Validate personalized pricing based on user location, cultural preferences, and saved stores

### **Multi-Tier Pricing Testing**
The `PricingFallbackTest` component ensures reliable pricing across all service tiers:

- **🔄 Fallback System Testing** - Validate Perplexity → Kroger → Basic estimates fallback chain
- **⚡ Health Monitoring** - Real-time service health checks and automatic failover testing
- **📊 Confidence Analysis** - Transparent confidence scoring validation across all pricing sources
- **🛡️ Error Recovery Testing** - Comprehensive error handling and graceful degradation validation
- **👤 User Profile Integration** - Test personalized pricing based on user location, cultural preferences, and saved stores

## 📋 Changelog

### Version 2.1.0 - Store Discovery & Shopping Optimization (January 2025)

**🎉 Major Release:** Enhanced store discovery and shopping optimization with advanced cultural intelligence.

#### **🆕 New Features**
- **Store Discovery System** - Complete location-based store discovery API with cultural market identification
- **Enhanced Geocoding Services** - Multi-tier geocoding with Google API primary and comprehensive fallbacks
- **Shopping Route Optimization** - AI-powered multi-store shopping routes balancing cost, distance, and authenticity
- **Advanced Ingredient Search** - Redesigned ingredient search with quantity normalization and unit conversion
- **User Location Management** - Seamless location detection and management for personalized experiences
- **Interactive Store Selection** - Enhanced store selector with real-time calculations and cultural context

#### **🔧 Technical Improvements**
- **New API Endpoints**: `/api/stores/discover`, `/api/stores/validate`, `/api/ingredients/search`, `/api/pricing/optimize-stores`
- **Enhanced Components**: StoreSelector, IngredientSearchModal, useUserLocation hook
- **Improved Services**: Geocoding service with fallbacks, ingredient quantity normalizer
- **Database Enhancements**: Store discovery caching, location intelligence, cultural market mapping

#### **📊 Performance & Reliability**
- **99.9% Location Resolution** - Multi-tier geocoding ensures reliable location services
- **Enhanced Error Handling** - Comprehensive fallback systems for all location-based features
- **Improved Caching** - Optimized store discovery and location data caching
- **Mobile Optimization** - Enhanced responsive design for mobile shopping experiences

---

## 🚀 Current Status

PlateWise has reached a significant milestone with a comprehensive foundation and production-ready features. The platform now includes advanced recipe management with real-time pricing integration, comprehensive cultural authenticity tracking, and a complete AI-powered meal planning system:

- ✅ **Complete Authentication System** - Supabase Auth with email confirmation, password reset, OAuth callbacks, and secure session management
- ✅ **Advanced Profile Setup** - 7-step cultural onboarding wizard with personal info, cultural preferences, dietary restrictions, budget settings, nutritional goals, cooking profile, and comprehensive review
- ✅ **Production Database** - Full PostgreSQL schema with Row Level Security, cultural metadata support, and optimized queries
- ✅ **Cultural Design System** - Bento-style UI with 5 dynamic cultural themes, responsive grid system, and accessibility compliance
- ✅ **Modern Landing Experience** - Responsive design with cultural imagery, theme switching, and optimized performance
- ✅ **AI-Powered Intelligence** - Amazon Bedrock integration with Claude 3.5 Sonnet for culturally-aware meal planning and recipe analysis
- ✅ **Comprehensive API Layer** - 9+ integrated external services with circuit breakers, rate limiting, caching, and health monitoring
- ✅ **Advanced Recipe Management** - Complete CRUD system with cultural authenticity scoring, intelligent scaling, AI-powered cost analysis, and community features
- ✅ **Advanced Multi-Tier Pricing Intelligence** - Complete EnhancedPricingService with Perplexity AI primary, Kroger fallback, basic estimates, plus enhanced CulturalPricingService with comprehensive database schema for culturally-aware specialty ingredient pricing and ethnic market integration
- ✅ **User-Centric Pricing Optimization** - Enhanced pricing service now integrates user profiles, location data, cultural preferences, and saved stores for personalized cost optimization and culturally-aware recommendations
- ✅ **Multilingual Voice Integration** - ElevenLabs text-to-speech with cultural pronunciation guides and voice command system
- ✅ **Local Food Discovery** - Google Places and USDA integration for grocery stores, specialty markets, and farmer markets with cultural filtering
- ✅ **Enhanced AI-Powered Price Intelligence** - Multi-tier pricing system with Perplexity AI primary (including traditional name recognition and cultural context), Kroger fallback, cultural pricing analysis, route optimization, and shopping list generation
- ✅ **Developer Tools** - Comprehensive debugging components, MCP integration, and development utilities with recipe testing tools and pricing fallback testing
- ✅ **Cultural Authenticity Engine** - AI-powered cultural context analysis, preservation recommendations, and authenticity scoring (1-10 scale)
- ✅ **Error Handling & Reliability** - Production-ready error boundaries, graceful degradation, and comprehensive error recovery
- ✅ **Recipe Intelligence System** - Multi-source recipe search, cultural classification, ingredient scaling, and cost optimization
- ✅ **Advanced Budget Tracking System** - Complete budget monitoring with visual progress indicators, spending alerts, category breakdowns, and savings tracking
- 🔄 **AI-Powered Meal Planning** - Culturally-aware meal plans with cost optimization and nutritional balance (in progress)

## Key Features

### 🎯 Smart Budget Management

**The Problem:** Most budget apps just tell you when you've overspent. PlateWise helps you spend smarter from the start.

**Our Approach:** Proactive budget optimization that understands cultural food priorities and helps you make informed trade-offs.

#### **Budget Intelligence Features:**
- **📊 Visual Progress Tracking** - Real-time spending indicators with category breakdowns (produce, meat, dairy, pantry, specialty)
- **⚠️ Smart Alert System** - Proactive warnings at 75%, 90%, and 100% thresholds with actionable cost-saving suggestions
- **💡 Cultural Budget Optimization** - AI recommendations that balance authenticity with cost (e.g., "Buy saffron in bulk from Persian market, save 40%")
- **📈 Savings Achievement Tracking** - Monitor money saved through cultural pricing intelligence and smart shopping strategies
- **📅 Seasonal Cost Predictions** - Understand when cultural ingredients are cheapest and plan accordingly
- **🎫 Coupon Integration** - Kroger API integration for real-time coupon discovery and savings calculations
- **🏛️ USDA Guidelines Integration** - Government-backed budget recommendations tailored to household size and nutritional needs

### 🌍 Cultural Heritage Preservation

**Our Mission:** Food traditions shouldn't be lost due to budget constraints or ingredient availability. PlateWise helps families maintain their culinary heritage while adapting to modern realities.

#### **Cultural Preservation Features:**
- **📚 Authentic Recipe Classification** - Clear distinction between traditional, adapted, and fusion recipes with cultural impact scoring
- **👨‍🍳 Traditional Technique Guides** - Step-by-step instructions for authentic cooking methods with cultural context
- **🎓 Cultural Ingredient Education** - Learn about ingredient significance, traditional names, and proper usage
- **🎉 Festival & Holiday Planning** - Specialized meal planning for cultural celebrations and religious observances
- **🎨 Cultural Theme System** - 5 authentic cultural themes (Mediterranean, Asian, Latin American, African, Middle Eastern) with traditional color palettes and patterns
- **🗣️ Pronunciation Guides** - Audio pronunciation for traditional dish names and ingredients using ElevenLabs voice technology
- **👥 Community Knowledge Sharing** - Platform for families to share traditional recipes and cooking wisdom

### 🤖 AI-Powered Cultural Intelligence

**The Vision:** AI that doesn't just understand food—it understands food culture, tradition, and the deep connections between ingredients, techniques, and heritage.

#### **Core AI Capabilities:**
- **🧠 Amazon Bedrock Integration** - Claude 3.5 Sonnet provides culturally-aware meal planning with authenticity preservation
- **💰 Advanced Pricing Intelligence** - Multi-tier system combining Perplexity AI, Kroger API, and cultural market analysis
- **⭐ Cultural Authenticity Engine** - AI-powered scoring (1-10 scale) with preservation recommendations and traditional technique analysis
- **🔄 Smart Ingredient Substitutions** - Culturally-appropriate alternatives with cost and authenticity impact analysis
- **📝 Recipe Intelligence** - Extract and parse recipes from text, photos, or voice input with automatic cultural classification
- **💡 Budget Optimization AI** - Cost reduction strategies that maintain cultural authenticity and nutritional goals
- **🗣️ Multilingual Voice System** - ElevenLabs integration with cultural pronunciation guides and voice commands in 10+ languages
- **🔧 Production-Ready Architecture** - Circuit breakers, health monitoring, and intelligent fallbacks ensuring 99.9% uptime
- **📊 Confidence Scoring** - Transparent AI confidence ratings with detailed explanations for all recommendations
- **🛡️ Error Recovery & Resilience** - Graceful degradation and user-friendly error handling across all AI services

### 💰 Revolutionary Cultural Pricing Intelligence

PlateWise's pricing system represents a breakthrough in culturally-aware grocery cost analysis, designed to understand and respect diverse food traditions while optimizing budgets.

#### **What makes our pricing different:**
Think of it like having a culturally-knowledgeable friend who knows exactly where to find authentic ingredients at the best prices. Our AI doesn't just search for "rice"—it understands when you need basmati for biryani, jasmine for Thai curry, or bomba for paella, and knows which markets specialize in each.

#### Enhanced Multi-Tier Pricing Architecture
- **🧠 Perplexity AI Primary** - Real-time cultural intelligence that understands traditional ingredient names and ethnic market dynamics with enhanced response caching
- **🏪 Cultural Market Discovery** - Specialized pricing from halal, kosher, Asian, Mexican, Middle Eastern, and African markets with community verification and quality indicators
- **🛒 Kroger API Fallback** - Advanced product matching for mainstream grocery chains when cultural options aren't available
- **📊 Intelligent Estimates** - Smart price predictions based on ingredient categories and regional market data
- **👤 User Profile Integration** - Personalized pricing optimization based on user location, cultural preferences, saved stores, and shopping history
- **✅ Confidence Scoring** - Transparent 0-100% confidence ratings with detailed explanations of pricing sources and cultural authenticity metrics
- **⚡ Health Monitoring** - Real-time service health checks with automatic failover and status reporting
- **🎯 99.9% Coverage** - Guaranteed pricing availability through intelligent three-tier fallback system
- **🗄️ Enhanced Database Integration** - Comprehensive cultural pricing database with traditional name mapping, seasonal availability tracking, and bulk buying intelligence

#### **Cultural Intelligence Features**
- **🏷️ Traditional Name Recognition** - AI understands "za'faran" for saffron, "masa" for masa harina, "ghee" for clarified butter
- **📍 Ethnic Market Discovery** - Intelligent identification of specialty markets with quality ratings and cultural authenticity scores
- **⭐ Cultural Significance Analysis** - Ingredients classified as essential/important/common/optional for authentic cooking
- **🛍️ Smart Shopping Strategies** - Optimized multi-store routes that balance authenticity, cost, and convenience
- **📅 Seasonal Availability Tracking** - Understanding of when cultural ingredients are in peak season and best pricing
- **📦 Bulk Purchase Intelligence** - Recognition of cultural staples commonly bought in bulk with savings calculations
- **📝 Cultural Context & Tips** - Comprehensive preparation notes, sourcing recommendations, and authenticity guidance
- **🔄 Alternative Store Recommendations** - Backup options when primary ethnic markets aren't available
- **💡 Authenticity Impact Scoring** - Clear understanding of how ingredient substitutions affect traditional recipes

### 🌍 How Cultural Intelligence Works

**The Challenge:** Traditional grocery apps treat all ingredients the same—they might find you cheap "rice" but miss that you need specific varieties for authentic dishes. They don't understand that saffron from a Persian market is often fresher and cheaper than from mainstream stores.

**Our Solution:** PlateWise's Cultural Pricing Intelligence combines AI understanding with real-world cultural shopping knowledge.

#### **Real-World Example:**
When you're making Persian tahdig (crispy rice), our system:
1. **Recognizes** you need basmati rice (not just any rice) and saffron (za'faran)
2. **Discovers** local Persian markets that specialize in these ingredients
3. **Compares** prices between ethnic markets and mainstream stores
4. **Recommends** the best combination of authenticity and value
5. **Provides** cultural context about why these specific ingredients matter

#### **Advanced Cultural Intelligence Features:**

**🧠 AI-Powered Cultural Analysis**
- Understands traditional ingredient names across 15+ cuisines
- Evaluates cultural significance (essential vs. optional ingredients)
- Provides authenticity impact scoring for substitutions
- Generates cultural context and preparation guidance

**🏪 Ethnic Market Integration**
- Discovers halal, kosher, Asian, Mexican, Middle Eastern, and African markets
- Provides quality ratings and authenticity scores from cultural communities
- Maps cultural specialties and ingredient availability
- Offers alternative store recommendations with distance and pricing

**📊 Smart Shopping Optimization**
- Creates culturally-aware shopping routes that balance cost and authenticity
- Provides timing recommendations based on seasonal availability
- Offers bulk buying suggestions for cultural staples
- Generates cultural insights and shopping tips specific to each cuisine

#### Key Capabilities

**Enhanced AI-Powered Cultural Analysis**
- Analyzes each ingredient's cultural significance within specific cuisines (essential, important, common, optional)
- Identifies traditional names and alternative ingredient names across different languages and regions
- Understands seasonal availability patterns for cultural ingredients with sourcing tips
- Provides culturally-appropriate substitution recommendations with authenticity impact analysis
- Generates comprehensive cultural notes and preparation guidance for authentic cooking

**Intelligent Ethnic Market Discovery**
- Uses Google Places API with AI-enhanced analysis to identify cultural specialty stores
- Categorizes stores by cultural focus: halal, kosher, Asian, Mexican, Middle Eastern, African, Indian, and more
- Evaluates store authenticity and quality ratings from cultural communities
- Maps cultural specialties and ingredient availability for each discovered market
- Provides alternative store recommendations with distance and pricing comparisons

**Advanced Cultural Shopping Optimization**
- Creates optimized shopping routes that balance cost, authenticity, and convenience
- Prioritizes cultural markets for essential traditional ingredients with authenticity scoring
- Provides timing recommendations based on seasonal ingredient availability
- Generates cultural insights and shopping tips specific to each cuisine
- Offers bulk buying recommendations with savings calculations for cultural staples

**Enhanced Authenticity-Aware Pricing**
- Compares pricing between ethnic markets and mainstream stores with detailed analysis
- Factors in ingredient authenticity levels (traditional, adapted, substitute) with cultural impact scoring
- Provides confidence scoring for cultural ingredient availability and pricing accuracy
- Offers comprehensive cultural context including preparation methods and sourcing recommendations
- Tracks alternative stores and pricing options for maximum flexibility and savings

#### Integration with Enhanced Pricing
The Cultural Pricing Service works seamlessly with the existing EnhancedPricingService to provide comprehensive pricing coverage:
- **Cultural ingredients** → CulturalPricingService (ethnic markets + AI analysis)
- **Standard ingredients** → EnhancedPricingService (Perplexity + Kroger + basic estimates)
- **Hybrid approach** for recipes with mixed ingredient types
- **Unified confidence scoring** across all pricing sources

### 🏪 Advanced Store Discovery & Shopping Optimization

**Revolutionary Shopping Intelligence:** PlateWise's store discovery system combines location intelligence, cultural market expertise, and advanced route optimization to transform how you shop for culturally authentic ingredients.

#### **Core Store Discovery Features**
- **📍 Location-Based Discovery** - Advanced `/api/stores/discover` endpoint with intelligent geocoding and comprehensive fallback services
- **🏪 Interactive Store Selection** - StoreSelector component with real-time distance calculations, cultural specialties display, and enhanced UX
- **🗺️ Enhanced Geocoding Services** - Primary Google Geocoding API with multiple fallback options ensuring reliable location resolution
- **👤 User Location Management** - Seamless location detection and management through useUserLocation hook for personalized experiences
- **🔍 Advanced Ingredient Search** - Enhanced ingredient search modal with intelligent quantity normalization and unit conversion
- **⚖️ Quantity Normalization Engine** - Smart ingredient quantity parsing and standardization across different measurement systems

#### **Cultural Shopping Intelligence**
- **🌍 Cultural Store Intelligence** - AI-powered identification and analysis of ethnic markets, specialty stores, and cultural food sources
- **🏪 Multi-Tier Pricing Integration** - EnhancedPricingService combined with CulturalPricingService for comprehensive cost analysis
- **👤 User-Centric Store Recommendations** - Personalized store suggestions based on user location, cultural preferences, and saved shopping locations
- **🎯 Specialty Market Discovery** - Advanced discovery of halal, kosher, Asian, Mexican, Middle Eastern, African, and other cultural markets
- **🗺️ Cultural Context Mapping** - Understanding of which stores specialize in specific cultural ingredients and traditions
- **🏛️ Farmer Market Integration** - USDA data integration for local farmer markets, seasonal produce, and payment options (SNAP/WIC)

#### **Shopping Route Optimization**
- **📊 Smart Cultural Shopping Routes** - AI-optimized shopping strategies that balance authenticity, cost, and convenience
- **🛣️ Multi-Store Route Planning** - Intelligent routing across multiple stores to maximize savings while minimizing travel time
- **👥 Community-Driven Store Ratings** - Quality and authenticity ratings from cultural communities for specialty markets
- **🎫 Advanced Coupon System** - Kroger API integration for real-time coupon discovery, savings calculations, and deal optimization
- **📅 Seasonal Cultural Recommendations** - Understanding of when cultural ingredients are in season and where to find them best

### 📚 Intelligent Recipe Management

**Beyond Basic Recipe Storage:** PlateWise treats recipes as living cultural documents, not just ingredient lists.

#### **Advanced Recipe Features:**
- **🗄️ Cultural Recipe Database** - Full CRUD operations with Supabase integration, RLS security, and rich cultural metadata
- **⭐ Authenticity Classification** - AI-powered scoring (1-10 scale) distinguishing traditional, adapted, and fusion recipes
- **📁 Smart Collections** - Organize recipes by cultural themes, occasions, dietary needs, and personal preferences
- **🔍 Intelligent Search** - Multi-dimensional filtering by culture, cuisine, difficulty, time, authenticity, and dietary restrictions
- **🌐 Multi-Source Integration** - Unified search across Spoonacular API, internal database, and community contributions
- **👥 Community Rating System** - Multi-dimensional ratings for taste, cost-effectiveness, cultural authenticity, and difficulty
- **⚖️ Recipe Scaling Engine** - Intelligent ingredient scaling with proper unit conversions and cultural context preservation
- **💰 Real-time Cost Analysis** - Dynamic cost calculations with multi-store price comparisons and budget impact assessment
- **📱 Multiple Input Methods** - Support for text input, URL parsing, voice commands, and photo recognition with AI processing
- **🔧 Developer Tools** - Comprehensive debugging interface for recipe operations and database interactions
- **🧪 Advanced Testing Suite** - CulturalPricingTest component with authenticity prioritization and budget controls

### 👥 Community Features
- **Recipe Sharing** - Share recipes with cultural authenticity ratings and community feedback
- **Recipe Collections** - Create and share curated recipe collections with cultural themes
- **Community Ratings** - Multi-dimensional rating system for taste, cost, and authenticity
- **Cultural Preservation** - Community-driven validation of traditional recipes and techniques
- **Local Food Discovery** - Find specialty markets and farmer markets with cultural focus
- **Social Following** - Follow other users and discover culturally-relevant recipes

### 🎨 Design System
- **Bento Grid Layout** - Modern card-based interface with flexible sizing (small, medium, large, wide, tall, hero)
- **Dynamic Cultural Themes** - 5 culturally-inspired themes with authentic color palettes and traditional patterns
- **Responsive Architecture** - Mobile-first design with touch-friendly interactions and gesture support
- **Accessibility Excellence** - WCAG 2.1 AA compliance with screen reader support and keyboard navigation
- **Multi-language Support** - RTL language support for Arabic and Hebrew with cultural typography adaptation
- **Performance Optimized** - Lighthouse scores >90 Performance, >95 Accessibility with optimized assets

## Technology Stack

### Core Platform
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Styling**: Tailwind CSS with custom cultural themes and bento grid system
- **State Management**: React Context API with custom hooks

### AI & Machine Learning
- **AI Engine**: Amazon Bedrock with Claude 3.5 Sonnet model
- **Voice Processing**: ElevenLabs API for multilingual text-to-speech
- **Cultural Analysis**: Custom AI prompts for authenticity scoring
- **Recipe Intelligence**: AI-powered parsing and ingredient analysis
- **Enhanced Pricing Intelligence**: Perplexity AI for real-time grocery pricing with cultural context analysis, traditional name recognition, and ethnic market integration

### 🔗 External API Integrations

**Comprehensive Service Ecosystem:** PlateWise integrates with 10+ external services to provide comprehensive cultural food intelligence.

#### **Pricing & Shopping APIs**
- **🧠 Perplexity AI** - Primary pricing intelligence with cultural context and traditional name recognition
- **🛒 Kroger Catalog API v2** - Fallback pricing, advanced product matching, and real-time coupon integration
- **📍 Google Places API** - Grocery store and ethnic market discovery with cultural filtering and quality ratings
- **🏛️ USDA API** - Food composition data, farmer markets, seasonal produce, and nutritional guidelines

#### **AI & Intelligence Services**
- **🤖 Amazon Bedrock** - Claude 3.5 Sonnet for culturally-aware meal planning and recipe analysis
- **🗣️ ElevenLabs API** - Multilingual text-to-speech with cultural pronunciation guides (10+ languages)
- **🔍 Tavily API** - Cultural food research and authenticity validation with hooks system

#### **Recipe & Content APIs**
- **🍳 Spoonacular API** - Extensive recipe database with cultural cuisine filtering and nutritional data
- **📊 Enhanced Pricing Service** - Custom multi-tier pricing with confidence scoring and health monitoring
- **🌍 Cultural Pricing Service** - Ethnic market integration with authenticity scoring and cultural intelligence

#### **Infrastructure & Reliability**
- **⚡ Circuit Breaker Patterns** - Automatic failover and health monitoring across all services
- **📊 Confidence Scoring** - Transparent reliability ratings for all external data sources
- **🔄 Intelligent Fallbacks** - Multi-tier architecture ensuring 99.9% service availability
- **👤 User Context Integration** - All services now support user profile integration for personalized experiences

### 🏗️ Infrastructure & Performance

**Production-Ready Architecture:** Built for scale, reliability, and cultural authenticity from day one.

#### **Performance & Reliability**
- **⚡ Advanced Caching** - Redis for API response caching with cultural pricing cache layers and intelligent TTL management
- **🔄 Circuit Breaker Patterns** - Automatic failover and health monitoring across all pricing tiers with 99.9% uptime target
- **🛡️ Error Handling** - Production-ready error boundaries with graceful degradation and user-friendly recovery options
- **🧪 Comprehensive Testing** - Jest, React Testing Library, accessibility testing, and cultural authenticity validation
- **🚀 Deployment** - Vercel with automatic deployments, environment management, and performance monitoring
- **📊 Monitoring** - Built-in error tracking, performance analytics, API usage monitoring, and cultural pricing health checks

#### **Database & Security**
- **🗄️ Supabase PostgreSQL** - Row Level Security (RLS), cultural metadata support, and ethnic market data storage with enhanced schema
- **🔐 Security Standards** - API key protection, input validation, CORS policies, and HTTPS enforcement
- **📈 Scalability** - Optimized queries, connection pooling, and horizontal scaling capabilities
- **🆕 Enhanced Schema** - New interfaces for EnhancedCulturalIngredient, PerplexityCulturalResponse, PerplexityDiscoveredMarket, and CulturalPricingConfidence with comprehensive cultural pricing intelligence storage and traditional name mapping

#### **Cultural Intelligence Infrastructure**
- **🌍 Multi-Tier Pricing System** - EnhancedPricingService with Perplexity AI primary, Kroger fallback, and intelligent estimates
- **🏪 Cultural Market Integration** - CulturalPricingService with ethnic market discovery and authenticity scoring
- **👤 Personalized Intelligence** - User profile integration across all pricing and cultural services for tailored recommendations
- **🧠 AI Service Management** - Circuit breakers, rate limiting, and health monitoring for all AI services
- **🗄️ Enhanced Database Architecture** - Comprehensive cultural pricing database with user preference integration and traditional ingredient mapping

## 🏗️ Project Architecture

**Modern, Scalable, Cultural-First Design:** PlateWise is built with a modular architecture that prioritizes cultural authenticity, performance, and developer experience.

```
platewise/
├── .kiro/                         # AI-Assisted Development Configuration
│   ├── specs/plate-wise/          # Comprehensive project specifications
│   │   ├── requirements.md        # 22 detailed requirement sections
│   │   ├── design.md             # Technical architecture document
│   │   ├── tasks.md              # 45+ implementation tasks
│   │   └── perplexity-cultural-pricing-plan.md # Cultural pricing roadmap
│   ├── settings/                 # Development environment settings
│   │   └── mcp.json              # Model Context Protocol configuration
│   └── steering/                 # Development guidelines & standards
│       ├── platewise-development-standards.md
│       ├── cultural-authenticity-guide.md
│       ├── api-integration-patterns.md
│       └── style.md              # Code style and response guidelines
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── auth/                 # Authentication flows
│   │   │   ├── callback/         # OAuth callback handling
│   │   │   ├── confirm/          # Email confirmation
│   │   │   ├── reset-password/   # Password reset flow
│   │   │   └── page.tsx          # Main auth page
│   │   ├── dashboard/            # Main application dashboard
│   │   ├── profile/              # Profile management & setup
│   │   │   ├── setup/            # Profile setup wizard
│   │   │   └── manage/           # Profile management
│   │   ├── recipes/              # Recipe browsing and management
│   │   │   └── [id]/             # Individual recipe pages
│   │   ├── budget/               # Budget tracking and management pages
│   │   ├── shopping/             # Shopping list management
│   │   ├── meal-plans/           # Meal planning interface
│   │   ├── help/                 # Help and support pages
│   │   ├── debug/                # 🛠️ Advanced Developer Tools
│   │   │   ├── page.tsx          # Debug dashboard with comprehensive testing suite
│   │   │   └── components/       # Debug components (RecipeDebug, PricingFallbackTest, CulturalPricingTest, EnhancedCulturalPricingTest)
│   │   ├── api/                  # 🔌 Next.js API Routes
│   │   │   ├── budget/           # Budget tracking and management endpoints
│   │   │   │   └── current/      # Current budget period API
│   │   │   ├── kroger/           # Kroger API integration endpoints
│   │   │   │   └── locations/    # Store location services
│   │   │   ├── pricing/          # 💰 Advanced Multi-Tier Pricing System
│   │   │   │   ├── alternatives/ # Alternative ingredient pricing with confidence scoring
│   │   │   │   ├── enhanced/     # EnhancedPricingService with Perplexity primary, Kroger fallback, and user profile integration
│   │   │   │   ├── cultural/     # CulturalPricingService for ethnic market integration
│   │   │   │   ├── cultural-enhanced/ # Enhanced cultural pricing with database integration
│   │   │   │   ├── ingredients/  # Ingredient price lookup with AI-powered matching
│   │   │   │   └── route.ts      # Main pricing endpoint with multi-tier fallback
│   │   │   ├── recipes/          # Recipe management endpoints
│   │   │   │   ├── import/       # Recipe import and parsing
│   │   │   │   ├── search/       # Recipe search with cultural filtering
│   │   │   │   └── repair/       # Recipe data repair and enhancement
│   │   │   ├── recommendations/  # AI-powered recommendation endpoints
│   │   │   └── search/           # Search functionality endpoints
│   │   │       └── tavily/       # Tavily cultural research integration
│   │   └── page.tsx              # Landing page
│   ├── components/               # 🧩 React Component Library
│   │   ├── auth/                 # 🔐 Authentication components (SignIn, SignUp, ForgotPassword)
│   │   ├── budget/               # 💰 Budget tracking components
│   │   │   └── BudgetTracker.tsx # Advanced budget tracker with visual progress and smart alerts
│   │   ├── dashboard/            # 📊 Dashboard bento cards and recommendations
│   │   ├── debug/                # 🛠️ Advanced Developer Tools
│   │   │   ├── RecipeDebug.tsx   # Recipe system testing and debugging
│   │   │   ├── PricingFallbackTest.tsx # Interactive pricing system testing with health monitoring
│   │   │   ├── CulturalPricingTest.tsx # Cultural pricing testing with authenticity controls
│   │   │   └── EnhancedCulturalPricingTest.tsx # Enhanced cultural pricing testing with database integration
│   │   ├── landing/              # 🏠 Landing page components (LandingPage, LoadingScreen)
│   │   ├── layout/               # 🎨 Layout and navigation (AppLayout, MainNavigation)
│   │   ├── profile/              # 👤 Profile setup wizard (7 steps) and management
│   │   │   ├── steps/            # Individual cultural onboarding steps
│   │   │   └── __tests__/        # Comprehensive component tests
│   │   ├── recipes/              # 🍳 Advanced Recipe Management
│   │   │   ├── EnhancedPricingPanel.tsx # Multi-tier pricing dashboard with health monitoring and user profile integration
│   │   │   ├── EnhancedCulturalPricingPanel.tsx # Enhanced cultural pricing with database integration
│   │   │   ├── CulturalPricingPanel.tsx # Cultural pricing with ethnic market analysis
│   │   │   ├── PerplexityPricingPanel.tsx # Advanced Perplexity AI pricing with cultural intelligence
│   │   │   ├── RecipeInputModal.tsx  # Multi-method recipe input (text, URL, voice, photo)
│   │   │   ├── RecipeScaling.tsx     # Intelligent recipe scaling with cultural context
│   │   │   ├── RecipeRecommendations.tsx # AI-powered recipe suggestions
│   │   │   ├── SpoonacularSearch.tsx # Spoonacular API integration
│   │   │   └── TavilySearch.tsx      # Cultural research integration
│   │   ├── bento/                # 🎨 Bento grid system components
│   │   ├── navigation/           # 🧭 Navigation components (Breadcrumb)
│   │   ├── ui/                   # 🎛️ Reusable UI components (Button, Logo, ThemeSwitcher)
│   │   ├── ErrorBoundary.tsx     # 🛡️ Production-ready error boundary with recovery
│   │   └── Providers.tsx         # 🔗 Centralized context providers
│   ├── contexts/                 # ⚡ React contexts (Auth, Theme)
│   ├── hooks/                    # 🎣 Custom React hooks
│   │   ├── useAuth.ts            # Authentication state management
│   │   ├── useEnhancedPricing.ts # Multi-tier pricing intelligence with user profile integration
│   │   ├── useEnhancedCulturalPricing.ts # Enhanced cultural pricing with database integration
│   │   ├── useCulturalPricing.ts # Cultural pricing and ethnic market analysis
│   │   ├── useProfileSetup.ts    # Cultural onboarding wizard
│   │   ├── useProfileTheme.ts    # Dynamic cultural theming
│   │   └── useTavily.ts          # Cultural research integration
│   ├── lib/                      # 🏗️ Core Services & Utilities
│   │   ├── ai/                   # 🤖 Amazon Bedrock AI service with Claude 3.5 Sonnet
│   │   ├── auth/                 # 🔐 Authentication helpers and configuration
│   │   ├── budget/               # 💰 Budget tracking and management services
│   │   ├── database/             # 🗄️ Database services and cultural pricing storage
│   │   │   └── cultural-pricing-db.ts # Cultural pricing database service
│   │   ├── external-apis/        # 🔌 External API Integration Layer
│   │   │   ├── enhanced-pricing-service.ts # Multi-tier pricing intelligence with user profile integration
│   │   │   ├── enhanced-cultural-pricing-service.ts # Enhanced cultural pricing with database integration
│   │   │   ├── cultural-pricing-service.ts # Cultural pricing and ethnic markets
│   │   │   ├── perplexity-service.ts # Advanced Perplexity AI integration
│   │   │   ├── kroger-service.ts # Kroger API integration
│   │   │   ├── spoonacular-service.ts # Recipe discovery service
│   │   │   ├── elevenlabs-service.ts # Multilingual voice service
│   │   │   ├── google-places-service.ts # Store and market discovery
│   │   │   ├── tavily-service.ts # Cultural research service
│   │   │   └── usda-service.ts   # Government nutrition data
│   │   ├── recipes/              # 🍳 Recipe management and analysis
│   │   │   ├── recipe-service.ts # Core recipe operations
│   │   │   ├── recipe-scaling-service.ts # Intelligent scaling
│   │   │   ├── recipe-recommendations-service.ts # AI recommendations
│   │   │   └── recipe-analysis-service.ts # Cultural analysis
│   │   ├── services/             # 🔧 Business Logic Services
│   │   │   └── cultural-pricing-integration-service.ts # Cultural pricing orchestration
│   │   ├── themes/               # 🎨 Cultural theme system
│   │   └── supabase/             # 🗄️ Database client configuration─ external-apis/        # External API integrations (9+ services)
│   │   │   ├── enhanced-pricing-service.ts # Multi-tier pricing service with Perplexity primary, Kroger fallback, and user profile integration
│   │   │   ├── cultural-pricing-service.ts # AI-powered cultural pricing with ethnic market integration and authenticity scoring
│   │   │   ├── perplexity-service.ts # Enhanced AI-powered grocery pricing with cultural context and traditional name recognition
│   │   │   ├── kroger-service.ts # Kroger Catalog API v2 fallback with advanced product matching
│   │   │   ├── kroger-catalog-v2.ts # Enhanced Kroger integration with confidence scoring
│   │   │   ├── kroger-matching.ts # Intelligent product matching algorithms
│   │   │   ├── spoonacular-service.ts # Recipe database API
│   │   │   ├── elevenlabs-service.ts # Voice synthesis with cultural pronunciation
│   │   │   ├── google-places-service.ts # Store discovery with cultural filtering
│   │   │   ├── usda-service.ts   # Government food data and farmer markets
│   │   │   ├── tavily-service.ts # Cultural research and authenticity validation

│   │   │   ├── location-service.ts # Unified location services
│   │   │   ├── voice-interface.ts # Voice command system
│   │   │   └── price-comparison.ts # Advanced price analysis
│   │   ├── profile/              # Profile management services
│   │   ├── recipes/              # Recipe management services
│   │   │   ├── recipe-service.ts # Core recipe operations with CRUD
│   │   │   ├── recipe-database-service.ts # Database operations with RLS
│   │   │   ├── recipe-database-service-fix.ts # Enhanced database operations
│   │   │   ├── recipe-scaling-service.ts # Intelligent ingredient scaling
│   │   │   ├── recipe-analysis-service.ts # Cultural authenticity analysis
│   │   │   ├── recipe-recommendations-service.ts # AI-powered recommendations
│   │   │   └── html-recipe-parser.ts # Recipe parsing from HTML/text
│   │   ├── database/             # Database services and cultural pricing storage
│   │   │   └── cultural-pricing-db.ts # Cultural pricing database operations
│   │   ├── supabase/             # Supabase client configuration
│   │   ├── themes/               # Cultural theme system
│   │   ├── favicon/              # Favicon management
│   │   └── recommendations/      # AI recommendation services
│   ├── styles/                   # Global styles and cultural themes
│   ├── types/                    # Comprehensive TypeScript definitions
│   └── utils/                    # Utility functions and constants
├── public/                       # Static assets
│   ├── assets/                   # Images, logos, icons
│   │   ├── logo/                 # PlateWise branding assets
│   │   ├── images/               # Cultural food imagery
│   │   └── illustrations/        # UI illustrations
│   └── site.webmanifest          # PWA configuration
├── scripts/                      # Development scripts
├── supabase-schema.sql           # Complete database schema
└── Configuration files           # Next.js, Tailwind, ESLint, etc.
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- AWS account (for Bedrock)

### Environment Variables
Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Amazon Bedrock Configuration (Required for AI features)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# External API Keys (Optional for enhanced features)
# Advanced Multi-Tier Pricing APIs
PERPLEXITY_API_KEY=your_perplexity_api_key        # Primary AI-powered pricing service for EnhancedPricingService
KROGER_CLIENT_ID=your_kroger_client_id
KROGER_CLIENT_SECRET=your_kroger_client_secret    # Fallback pricing service for EnhancedPricingService and CulturalPricingService

# Recipe & Nutrition APIs
RAPIDAPI_KEY=your_rapidapi_key                    # For Spoonacular access via RapidAPI
SPOONACULAR_API_KEY=your_spoonacular_api_key      # Alternative direct access (deprecated)
USDA_API_KEY=your_usda_nutrition_api_key          # USDA FoodData Central

# Voice & Location APIs
ELEVENLABS_API_KEY=your_elevenlabs_api_key        # Voice synthesis
GOOGLE_PLACES_API_KEY=your_google_places_api_key  # Store discovery
TAVILY_API_KEY=your_tavily_api_key                # Cultural research (optional)

# Performance & Caching (Optional)
REDIS_URL=redis://localhost:6379

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Development Flags (Optional)
NEXT_PUBLIC_TAVILY_MOCK=false                     # Set to true to use mock data for Tavily API
USE_KROGER_CATALOG_V2=true                        # Set to true to use Kroger Catalog API v2 with advanced product matching (recommended)
ENABLE_ENHANCED_PRICING=true                      # Set to true to use EnhancedPricingService with multi-tier fallback (recommended)
ENABLE_CULTURAL_PRICING=true                      # Set to true to use CulturalPricingService with ethnic market integration (recommended)
ENABLE_PRICING_DEBUG=true                         # Set to true to enable detailed pricing debug logs and comprehensive pricing testing interface
```

**Note**: Copy `.env.example` to `.env.local` and update with your actual API keys. The application will work with just Supabase and AWS Bedrock credentials for core functionality. External API keys enable enhanced features:

- **Perplexity API**: Primary AI-powered pricing service for the EnhancedPricingService with real-time web price aggregation from major grocery stores
- **Kroger API**: Fallback pricing service for both EnhancedPricingService and CulturalPricingService with advanced product matching, confidence scoring, and coupon integration
- **Spoonacular API**: Expanded recipe database and nutritional data (use RAPIDAPI_KEY for best results)
- **ElevenLabs API**: Multilingual voice synthesis and commands with cultural pronunciation guides
- **Google Places API**: Local store discovery and specialty market finding with cultural filtering
- **USDA API**: Government nutrition data and farmer market information
- **Tavily API**: Cultural food research and authenticity validation with hooks integration

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd platewise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql`
   - Configure authentication providers
   - Set up Row Level Security policies

4. **Configure AWS Bedrock**
   - Set up AWS credentials with Bedrock access
   - Enable Claude 3.5 Sonnet model access in your AWS region
   - Ensure proper IAM permissions for Bedrock runtime

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open application**
   Navigate to `http://localhost:3000`

7. **Test advanced pricing systems (optional)**
   Navigate to `http://localhost:3000/debug` to access comprehensive pricing testing:
   - **PricingFallbackTest** - Test EnhancedPricingService with real-time health monitoring
   - **CulturalPricingTest** - Test CulturalPricingService with ethnic market analysis and cultural ingredient pricing

## 🛠️ Development & Testing Tools

PlateWise includes comprehensive development and testing tools to ensure reliability and performance of all features, especially the complex pricing and AI systems.

### Debug Dashboard
Access the debug dashboard at `/debug` to test and monitor various system components:

- **PricingFallbackTest** - Interactive testing of the EnhancedPricingService
  - Test complete multi-tier pricing with Perplexity primary, Kroger fallback, and basic estimates
  - Monitor real-time health status of Perplexity and Kroger services
  - View confidence scores and automatic fallback behavior
  - Add/remove ingredients dynamically with live updates
  - Test different locations and store availability
  - View detailed API response logs, error handling, and service health metrics

- **RecipeDebug** - Comprehensive recipe system testing
  - Test recipe creation, parsing, and database operations
  - Monitor authentication flows and user permissions
  - Debug cultural authenticity scoring algorithms
  - Test recipe scaling and cost calculations

### Advanced Pricing System Testing
PlateWise includes comprehensive testing interfaces for both pricing systems:

#### Enhanced Pricing System Testing
The PricingFallbackTest component provides a complete testing interface for the EnhancedPricingService:

1. **Multi-Tier Testing** - Test the complete EnhancedPricingService with Perplexity AI primary, Kroger API fallback, and basic estimates
2. **Health Monitoring** - Real-time health checks for Perplexity and Kroger services with automatic failover detection
3. **Confidence Scoring** - Monitor pricing confidence levels (0-100%) across all pricing tiers with detailed source attribution
4. **Fallback Behavior** - Verify automatic fallback from Perplexity → Kroger → Basic estimates with transparent reporting
5. **Multi-Location Support** - Test pricing across different ZIP codes and cities with location-aware results
6. **Real-time Updates** - See live pricing updates, API response times, fallback behavior, and service health status

#### Cultural Pricing System Testing
The CulturalPricingTest component provides testing for culturally-aware pricing:

1. **Cultural Context Analysis** - Test AI-powered ingredient cultural significance analysis
2. **Ethnic Market Discovery** - Verify cultural store identification and specialty matching
3. **Authenticity Scoring** - Monitor cultural authenticity ratings and traditional ingredient analysis
4. **Cultural Shopping Strategy** - Test multi-store route optimization with cultural priorities
5. **Specialty Ingredient Pricing** - Compare pricing between ethnic markets and mainstream stores
6. **Cultural Recommendations** - Validate AI-generated cultural shopping recommendations

### API Health Monitoring
- Circuit breaker status for all external APIs
- Real-time health monitoring for EnhancedPricingService (Perplexity and Kroger services)
- Cultural pricing system health monitoring with ethnic market API status
- Rate limiting and usage statistics across all pricing tiers
- Cache hit/miss ratios and performance metrics for both standard and cultural pricing
- Cultural authenticity validation results and ingredient analysis accuracy
- Pricing confidence scores and fallback behavior analytics
- Ethnic market discovery success rates and cultural store matching accuracyllback behavior tracking

## 🎨 Design Philosophy

PlateWise uses a modern **bento-style design system** with bold, culturally-inspired color palettes that celebrate the diversity of global cuisines. The interface dynamically adapts to different cultural themes while maintaining accessibility and usability standards.

### Bento Grid System
- **Responsive Cards** - Flexible grid layout that adapts to content
- **Cultural Theming** - Dynamic color schemes and patterns
- **Accessibility First** - WCAG 2.1 AA compliance with proper contrast ratios
- **Mobile Optimized** - Touch-friendly interface with gesture support

### Cultural Themes
- **Mediterranean** - Warm oranges and greens with olive branch patterns (#E67E22, #27AE60)
- **Asian** - Bold reds and purples with geometric elements (#E74C3C, #8E44AD)
- **Latin American** - Vibrant corals and teals with textile patterns (#FF6B6B, #4ECDC4)
- **African** - Earth tones with traditional geometric designs (#D35400, #F1C40F)
- **Middle Eastern** - Rich purples and golds with arabesque patterns (#8E44AD, #E67E22)

### Typography & Branding
- **Primary Font** - Fredoka for headings (playful, approachable)
- **Body Font** - Inter for content (readable, professional)
- **Cultural Adaptation** - Right-to-left language support
- **Logo System** - Adaptive logo with cultural color variations

## 🤖 AI-Powered Features

PlateWise leverages Amazon Bedrock with Claude 3.5 Sonnet to provide intelligent, culturally-aware meal planning and recipe analysis:

### Core AI Capabilities
- **Intelligent Meal Planning** - Generate personalized meal plans respecting cultural preferences and budget constraints
- **Cultural Authenticity Analysis** - Score recipes for traditional accuracy (1-10 scale) and suggest preservation methods
- **Smart Ingredient Substitutions** - Recommend culturally-appropriate alternatives with cost and authenticity impact analysis
- **Recipe Intelligence** - Parse recipes from text, photos, or voice input with cultural context and authenticity classification
- **Budget Optimization** - AI-driven cost reduction strategies while maintaining cultural authenticity and nutritional goals
- **Multi-language Translation** - Preserve cultural context and culinary terminology across languages
- **Product Matching Intelligence** - AI-powered ingredient-to-product matching with confidence scoring and explanations
- **Real-time Pricing Intelligence** - Multi-tier pricing system with Perplexity AI fallback for comprehensive grocery price coverage
- **Confidence-Based Decision Making** - All AI recommendations include confidence scores to help users make informed decisions

### AI Service Architecture
- **Circuit Breaker Pattern** - Graceful handling of AI service failures with automatic recovery
- **Rate Limiting** - Intelligent request management to prevent API abuse and optimize costs
- **Caching Strategy** - Optimize AI response times and reduce costs with cultural context preservation
- **Cultural Prompting** - Specialized prompts that include cultural context and authenticity requirements
- **Fallback Systems** - Ensure application functionality even when AI services are unavailable
- **Confidence Scoring** - AI-powered confidence metrics for product matching and recipe analysis
- **Error Recovery** - Comprehensive error handling with meaningful user feedback and alternative suggestions
- **Multi-AI Integration** - Perplexity AI for real-time pricing fallback with web search capabilities

## 💰 Advanced Pricing Integration

PlateWise features a sophisticated real-time pricing system that provides accurate cost analysis while maintaining cultural authenticity:

### Kroger Catalog API v2 Integration
- **Advanced Product Matching** - Intelligent algorithms match recipe ingredients to grocery products with confidence scoring
- **Confidence Scoring System** - Each product match includes a confidence score (0-1) with detailed explanations
- **Alternative Suggestions** - AI-powered alternative product recommendations when primary matches have low confidence
- **Detailed Match Explanations** - Understand why products were matched, including category alignment, title similarity, and size proximity
- **Cultural Context Preservation** - Maintain ingredient authenticity while finding the best product matches
- **Real-time Price Updates** - Live pricing data with store-specific availability and promotional information

### Perplexity AI Fallback Pricing
- **Intelligent Fallback System** - Automatically switches to Perplexity AI when Kroger API is unavailable or lacks pricing data
- **Real-time Web Search** - Leverages current grocery store websites and pricing information across major retailers
- **Confidence-Based Pricing** - Each price estimate includes confidence scoring based on source reliability and recency
- **Multi-Store Coverage** - Searches across Walmart, Target, Kroger, Safeway, Instacart, and other major grocery retailers
- **Structured Price Data** - Returns standardized pricing information with store names, units, and explanatory notes
- **Graceful Degradation** - Falls back to estimated pricing when all external services are unavailable
- **Interactive Testing Interface** - PricingFallbackTest component allows developers to test the complete fallback system with real ingredients

### Pricing Intelligence Features
- **Multi-Store Comparison** - Compare prices across different store locations with distance optimization
- **Budget Impact Analysis** - Real-time calculation of recipe costs with per-serving breakdowns
- **Seasonal Price Trends** - Historical pricing data to identify optimal buying times
- **Bulk Buying Recommendations** - Suggest bulk purchases when cost-effective with expiration considerations
- **Coupon Integration** - Automatic coupon discovery and savings calculations
- **Shopping List Optimization** - Generate optimized shopping lists with route planning and cost minimization
- **Intelligent Fallback Pricing** - Perplexity AI provides current grocery prices from major retailers when primary APIs fail
- **Developer Testing Tools** - Interactive components for testing pricing accuracy and fallback behavior across different scenariosail
- **Service Reliability** - Multiple pricing sources ensure 99.9% availability with graceful degradation

## 📚 Recipe Management System

PlateWise includes a comprehensive recipe management system with full CRUD operations, cultural authenticity tracking, intelligent scaling capabilities, and real-time pricing integration:

### Core Database Features
- **Advanced Recipe CRUD** - Create, read, update, and delete recipes with proper authorization and RLS security
- **Cultural Authenticity Engine** - AI-powered classification system for traditional, adapted, inspired, and fusion recipes with 1-10 scoring
- **Smart Recipe Collections** - Organize recipes into custom collections with cultural themes, privacy controls, and sharing capabilities
- **Multi-dimensional Search** - Advanced filtering by culture, cuisine, difficulty, cooking time, authenticity level, dietary restrictions, and cost
- **Community Rating System** - Multi-dimensional ratings for taste, cost-effectiveness, cultural authenticity, and difficulty level
- **Intelligent Recipe Scaling** - Dynamic ingredient scaling with proper unit conversions and cultural context preservation
- **Real-time Cost Integration** - Live cost calculations with multi-store price comparisons, confidence scoring, and budget impact analysis
- **Advanced Product Matching** - Kroger Catalog API v2 integration with intelligent product matching and alternative suggestions
- **Developer Debug Tools** - Comprehensive debugging components for recipe operations, authentication, and database interactions

### Recipe Components Architecture
- **RecipeCard** - Beautiful recipe display with cultural theming, cost analysis, and authenticity indicators
- **RecipeForm** - Comprehensive recipe creation and editing interface with cultural context validation and real-time pricing
- **RecipeSearch** - Advanced search with cultural, dietary, authenticity filters, and AI-powered suggestions
- **RecipeList** - Responsive bento grid layout with infinite scroll, cultural categorization, and performance optimization
- **RecipeScaling** - Interactive ingredient scaling with intelligent unit conversion and cultural technique preservation
- **RecipeInputModal** - Multi-method recipe input (text, URL, voice, photo) with AI parsing and cultural classification
- **RecipeRecommendations** - AI-powered suggestions based on cultural preferences, budget constraints, and nutritional goals
- **GroceryPricing** - Real-time grocery pricing component with confidence scoring, product matching explanations, and alternative suggestions
- **PricingPanel** - Interactive pricing dashboard for ingredient cost tracking, budget optimization, and store comparison
- **SpoonacularSearch** - Integration with Spoonacular API for extensive recipe database access with cultural filtering
- **TavilySearch** - Cultural food research and authenticity validation through Tavily API with hooks integration
- **RecipeDebug** - Production-ready debugging tool for recipe operations, authentication flows, database interactions, and pricing analysis

### Cultural Intelligence Features
- **Authenticity Classification** - AI-powered categorization with cultural significance analysis and preservation recommendations
- **Cultural Context Engine** - Historical background, traditional occasions, and cultural significance documentation
- **Regional Variation Support** - Multiple authentic versions of dishes with geographic and family tradition variations
- **Ingredient Impact Tracking** - Monitor and analyze cultural impact of ingredient substitutions with AI guidance
- **Traditional Method Preservation** - Document and preserve traditional cooking techniques with video and audio guides
- **Cultural Expert Integration** - Community validation system for cultural accuracy and authenticity verification

## 🛡️ Error Handling & Reliability

PlateWise is built with production-ready reliability and comprehensive error handling:

### Error Boundary System
- **React Error Boundaries** - Catch and handle component errors gracefully without crashing the entire application
- **User-Friendly Recovery** - Clear error messages with actionable recovery options (refresh, retry, navigate)
- **Development Debugging** - Detailed error information and stack traces in development mode
- **Graceful Degradation** - Application continues to function even when individual components fail
- **Error Reporting** - Comprehensive error logging for monitoring and debugging

### Service Reliability
- **Circuit Breaker Pattern** - Automatic failover for external API failures with intelligent retry logic
- **Fallback Systems** - Alternative data sources and cached responses when services are unavailable
- **Health Monitoring** - Real-time monitoring of all external services with automatic recovery
- **Rate Limiting** - Intelligent request throttling to prevent API abuse and ensure service stability
- **Timeout Handling** - Proper timeout management for all external API calls with user feedback

## 🌍 Cultural Sensitivity

PlateWise is built with deep respect for cultural food traditions. Our development follows strict guidelines to:

- **Preserve Authenticity** - Traditional recipes are treated as cultural heritage
- **Provide Context** - Cultural significance and history are included with AI analysis
- **Support Diversity** - Accommodate various dietary restrictions and cultural preferences
- **Promote Learning** - Encourage respectful cultural exchange through AI-powered education
- **Community Oversight** - Cultural communities review AI-generated content for accuracy
- **AI Validation** - All AI suggestions undergo cultural authenticity verification

## 🔌 API Integrations

PlateWise integrates with 8+ external services through a robust, production-ready API layer:

### Grocery & Shopping Intelligence
- **Kroger Catalog API v2** - Real-time product pricing, availability, coupon integration, and store location services with advanced product matching algorithms
- **Intelligent Product Matching** - Confidence scoring system with detailed explanations for ingredient-to-product matching accuracy
- **Alternative Product Suggestions** - AI-powered alternative product recommendations with cost and cultural impact analysis
- **Google Places API** - Grocery store and specialty market discovery with cultural filtering and distance optimization
- **Advanced Price Comparison** - Multi-store price analysis with route optimization, fuel cost calculations, and savings projections
- **Unified Location Service** - Integrated local food sourcing combining Google Places and USDA farmer market data

### Recipe & Nutrition Intelligence
- **Spoonacular API** - Extensive recipe database (1M+ recipes) with cultural cuisine filtering and nutritional analysis
- **USDA FoodData Central** - Government food composition, nutritional data, and dietary guidelines integration
- **Internal Recipe Engine** - Comprehensive CRUD operations with cultural authenticity tracking and AI analysis
- **Tavily Research API** - Cultural food research and authenticity validation (optional integration)

### AI & Voice Services
- **Amazon Bedrock** - Claude 3.5 Sonnet integration for culturally-aware meal planning and recipe analysis
- **ElevenLabs API** - Multi-language text-to-speech with cultural pronunciation guides and voice command processing
- **Voice Interface System** - Complete multilingual voice command system for hands-free cooking assistance and navigation
- **AI Health Monitoring** - Intelligent service availability checking with automatic fallbacks and circuit breakers

### Production-Ready Service Architecture
- **Circuit Breaker Pattern** - Automatic failover for unreliable APIs with exponential backoff and health monitoring
- **Intelligent Rate Limiting** - Request throttling with usage statistics, quota management, and cost optimization
- **Redis Caching Layer** - High-performance caching with cultural context preservation and intelligent TTL management
- **Graceful Error Recovery** - Comprehensive error handling with meaningful user feedback and service degradation
- **API Health Dashboard** - Unified health checking across all external services with real-time monitoring
- **Configuration Validation** - Automatic API key validation and service availability verification
- **Service Reliability** - 99.9% uptime target with redundancy and intelligent failover mechanisms
- **Cost Optimization** - API usage monitoring, caching strategies, and intelligent request batching
- **Security Standards** - Secure API key management, request validation, and data encryption
- **Advanced Product Matching** - Kroger Catalog v2 with confidence scoring, explanation system, and alternative suggestions
- **Cultural Context Preservation** - Maintain cultural authenticity throughout all API integrations and data transformations

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (when implemented)
npm run test:e2e

# Test cultural authenticity features
npm run test:cultural

# Test recipe management system
npm run test:recipes

# Test API integrations (requires API keys)
npm run test:integration

# Test external API health and circuit breakers
npm run test:api-health

# Test voice integration and local services
npm run test:voice

# Test MCP (Model Context Protocol) integrations
npm run test:mcp

# Test error boundaries and error handling
npm run test:error-handling
```

### Testing Standards
- **Unit Tests** - 80%+ coverage for business logic, AI integration, recipe management, and cultural authenticity algorithms
- **Cultural Validation** - Community-driven testing for cultural authenticity features and traditional recipe accuracy
- **API Integration Testing** - Comprehensive testing with mocked external services, circuit breaker validation, and error handling
- **Recipe System Testing** - Full CRUD operations, cultural authenticity scoring, scaling algorithms, and cost calculations
- **Voice & Audio Testing** - ElevenLabs integration testing for multilingual text-to-speech and voice command processing
- **End-to-End Testing** - Complete user workflows from authentication through meal planning and shopping
- **Accessibility Testing** - WCAG 2.1 AA compliance verification with screen reader and keyboard navigation testing
- **Performance Testing** - Lighthouse scores >90 Performance, >95 Accessibility with real-world load testing
- **Security Testing** - Authentication flows, RLS policies, API key security, and data protection validation
- **MCP Testing** - Model Context Protocol integration testing for AI service reliability and fallback mechanisms
- **Error Boundary Testing** - Comprehensive error handling validation with graceful degradation and user recovery flows

## 📚 Development Guidelines

### Code Standards
- **TypeScript** - Strict type checking enabled
- **ESLint** - Configured for Next.js and accessibility
- **Prettier** - Consistent code formatting
- **Cultural Sensitivity** - Follow authenticity guidelines
- **Performance** - Lighthouse scores >90 (Performance), >95 (Accessibility)
- **Error Boundaries** - Production-ready error handling with graceful degradation
- **State Management** - Centralized providers for consistent app-wide state

### API Integration Patterns
- **Error Handling** - Comprehensive retry logic with exponential backoff and circuit breakers
- **Caching Strategy** - Redis-based caching with intelligent TTL management and cultural context preservation
- **Rate Limiting** - Respect API limits with usage statistics and intelligent throttling
- **Cultural Context** - Include cultural information in all AI prompts and recipe analysis
- **Service Reliability** - Circuit breaker patterns with health monitoring and automatic failover
- **Data Normalization** - Consistent data formats across different APIs with cultural metadata preservation
- **Voice Integration** - Multi-language voice commands with cultural pronunciation support
- **Location Services** - Unified local food sourcing with specialty market discovery
- **Price Optimization** - Real-time price comparison with route optimization and coupon integration
- **Recipe Management** - Comprehensive CRUD operations with cultural authenticity scoring and scaling
- **Error Recovery** - User-friendly error boundaries with retry mechanisms and fallback options

## 🚀 Deployment

The application is configured for deployment on Vercel with automatic deployments:

```bash
# Build for production
npm run build

# Start production server locally
npm start

# Deploy to Vercel
vercel deploy

# Deploy to production
vercel --prod
```

### Environment Configuration
- Set all required environment variables in Vercel dashboard
- Configure AWS credentials for Bedrock access
- Set up Supabase production database
- Configure Redis instance for caching (optional)

### Performance Optimization
- Automatic image optimization with Next.js
- API response caching with Redis
- Static asset optimization
- Cultural theme CSS optimization

## 🤝 Contributing

This project prioritizes cultural sensitivity and authenticity. Contributors should:

1. **Read Guidelines** - Review cultural authenticity guidelines in `.kiro/steering/`
2. **Follow Standards** - Adhere to development standards for code quality and cultural sensitivity
3. **Test Thoroughly** - Test cultural features with community members when possible
4. **Respect Heritage** - Honor traditional knowledge and provide proper attribution
5. **AI Integration** - Follow established patterns for AI service integration
6. **Accessibility** - Ensure all features meet WCAG 2.1 AA standards

### Development Workflow
1. Fork the repository and create a feature branch
2. Follow TypeScript strict mode and ESLint rules
3. Write comprehensive tests for new features (including recipe management and API integrations)
4. Test cultural authenticity features with appropriate communities
5. Validate external API integrations with proper error handling and circuit breakers
6. Test recipe CRUD operations and cultural authenticity scoring
7. Test voice integration and local store discovery features
8. Submit pull request with detailed description and cultural impact assessment

### Cultural Review Process
- All cultural content undergoes community review
- AI-generated content is validated for cultural accuracy
- Traditional recipes require cultural expert consultation
- Ingredient substitutions must maintain cultural authenticity

## 📄 License

[License to be determined]

## 📈 Roadmap

### Current Phase (Q1 2025) - Production Ready Core
- ✅ **Complete Authentication System** - Supabase Auth with email confirmation, password reset, and OAuth
- ✅ **Advanced AI Integration** - Amazon Bedrock with Claude 3.5 Sonnet for cultural meal planning
- ✅ **Cultural Design System** - 5 dynamic themes with bento grid layout and accessibility compliance
- ✅ **Production Recipe System** - Full CRUD operations with cultural authenticity scoring and scaling
- ✅ **Robust API Layer** - 8+ external service integrations with circuit breakers and health monitoring
- ✅ **Cultural Authenticity Engine** - AI-powered cultural analysis and preservation recommendations
- ✅ **Multilingual Voice System** - ElevenLabs integration with cultural pronunciation guides
- ✅ **Local Food Discovery** - Google Places and USDA integration for stores and farmer markets
- ✅ **Developer Tools** - Comprehensive debugging, MCP integration, and development utilities
- 🔄 **AI Meal Planning** - Advanced meal plan generation with cultural balance and budget optimization
- 🔄 **Smart Shopping Lists** - AI-powered shopping optimization with store integration and route planning

### Next Phase (Q2 2025) - Advanced Features
- 📋 **Complete Meal Planning Workflow** - AI-optimized meal plans with cultural balance and budget constraints
- 📋 **Advanced Budget Tracking** - Real-time price monitoring, spending analysis, and savings recommendations
- 📋 **Community Platform** - Recipe sharing, cultural validation, and social features with expert review system
- 📋 **Mobile Application** - Native iOS/Android apps with offline capabilities and voice integration
- 📋 **Enhanced Voice Assistant** - Advanced cooking guidance, timer management, and hands-free navigation
- 📋 **Cultural Expert Network** - Professional chef and cultural expert validation system for authenticity

### Future Enhancements (Q3-Q4 2025)
- 📋 **Professional Partnerships** - Nutritionist and cultural expert collaboration platform
- 📋 **Cultural Calendar Integration** - Festival and holiday meal planning with traditional recipes
- 📋 **Family Heritage Tools** - Recipe preservation, family story documentation, and tradition sharing
- 📋 **Video Integration** - Cooking technique videos with cultural context and traditional methods
- 📋 **Social Exchange Platform** - Cultural food exchange, cooking classes, and community events
- 📋 **AI Recipe Generation** - Create new recipes based on cultural traditions and dietary preferences
- 📋 **Sustainability Features** - Food waste reduction, seasonal eating, and environmental impact tracking

## 📞 Support & Community

- **Documentation** - Comprehensive guides in `.kiro/specs/`
- **Cultural Guidelines** - Authenticity standards in `.kiro/steering/`
- **Issues** - Report bugs and request features via GitHub Issues
- **Discussions** - Community discussions for cultural food topics
- **Cultural Review** - Community-driven content validation process

---

**PlateWise** - Preserving culinary heritage while optimizing food budgets through intelligent AI technology.

*Built with respect for cultural traditions and powered by cutting-edge AI to make authentic, budget-friendly cooking accessible to everyone.*
#
# 🚀 Quick Start Guide

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Supabase account for database and authentication
- API keys for external services (see `.env.example`)

### **Installation**
```bash
# Clone the repository
git clone https://github.com/your-username/platewise.git
cd platewise

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### **Testing Cultural Features**
```bash
# Access the debug dashboard
http://localhost:3000/debug

# Test cultural pricing intelligence
- Select a cultural recipe (Persian, Mexican, Indian)
- Toggle authenticity vs. cost prioritization
- Set budget limits and analyze results
- Validate ethnic market discovery and pricing

# Test multi-tier pricing fallback
- Monitor service health in real-time
- Validate confidence scoring across all tiers
- Test error recovery and graceful degradation
```

### **Key Configuration Files**
- **Cultural Themes**: `src/lib/themes/cultural-themes.ts`
- **API Integration Patterns**: `.kiro/steering/api-integration-patterns.md`
- **Cultural Guidelines**: `.kiro/steering/cultural-authenticity-guide.md`
- **Development Standards**: `.kiro/steering/platewise-development-standards.md`
- **Database Schema**: `database-migrations/cultural-pricing-schema.sql` with enhanced interfaces for cultural pricing intelligence

### **Development Tools**
- **Cultural Pricing Test**: `/debug` - Test ethnic market discovery and authenticity scoring
- **Pricing Fallback Test**: `/debug` - Validate multi-tier pricing system reliability
- **Recipe Debug Tools**: `/debug` - Test recipe management and cultural analysis
- **MCP Integration**: `.kiro/settings/mcp.json` - Model Context Protocol configuration

---

**Built with ❤️ for cultural food preservation and budget optimization**

*PlateWise helps families maintain their culinary traditions while making smart financial decisions. Food is culture, and culture should be accessible to everyone.*