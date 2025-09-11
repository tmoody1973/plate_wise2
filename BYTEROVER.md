# BYTEROVER Handbook - PlateWise

## Layer 1: System Overview

### Purpose
PlateWise is a culturally-aware, AI-driven meal planning platform that helps families and individuals optimize their food budgets while preserving culinary traditions. The platform combines meal planning with pricing optimization, cultural authenticity analysis, and ingredient substitution capabilities.

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript (strict mode)
- **Backend**: Supabase (PostgreSQL with RLS, Auth, Storage)
- **AI Services**: Amazon Bedrock (Claude 3.5 Sonnet), OpenAI, Groq, Perplexity AI
- **Styling**: Tailwind CSS with cultural theme system
- **State Management**: React Context + custom hooks, Zustand for complex state
- **External APIs**: Kroger, Spoonacular, Google Places, USDA, ElevenLabs

### Architecture Pattern
Service Layer Architecture with circuit breaker patterns, multi-tier pricing system, and cultural authenticity analysis.

## Layer 2: Module Map

### Core Modules

#### Authentication & User Management (`src/contexts/`)
- **AuthContext**: Global authentication state management
- **UserLocationContext**: User location and preferences
- **ThemeContext**: Cultural theme selection and management

#### AI & External Services (`src/lib/`)
- **ai/bedrock-service**: Amazon Bedrock AI integration
- **external-apis/**: Complete API integration layer with circuit breakers
  - Kroger API, Spoonacular, Google Places, USDA APIs
  - Health monitoring and fallback patterns

#### Recipe Management (`src/lib/recipes/`, `src/components/recipes/`)
- Recipe CRUD operations with cultural authenticity tracking
- Recipe forms, cards, search functionality
- Database integration with cultural metadata

#### Meal Planning (`src/lib/meal-planning/`)
- **clean-meal-planner**: Core meal planning service
- **perplexity-meal-planner**: AI-powered recipe generation
- **enhanced-recipe-search**: Recipe discovery with cultural filters

#### Cultural System (`src/lib/themes/`)
- Cultural theme definitions and management
- Theme-aware component styling system

## Layer 3: Integration Guide

### Key APIs and Endpoints

#### Meal Planning APIs
- `POST /api/meal-plans/create`: Create new meal plan
- `POST /api/meal-plans/generate`: Generate AI-powered meal plan
- `GET /api/meal-plans/[id]`: Retrieve specific meal plan

#### Recipe Management
- `GET /api/recipes/search`: Search recipes with filters
- `POST /api/recipes/create`: Create new recipe
- `GET /api/recipes/[id]`: Get recipe details

#### External Service Integration
- Circuit breaker pattern implementation
- Health monitoring endpoints
- Fallback service layers

### Database Schema
- User profiles with cultural preferences
- Recipe collections with authenticity scoring
- Meal plans with pricing data
- Cultural authenticity tracking

## Layer 4: Extension Points

### Design Patterns
- Service Layer Architecture with dependency injection
- Circuit Breaker pattern for external API resilience
- Factory pattern for AI service selection
- Observer pattern for state management

### Customization Areas

#### Cultural Theme System
- Add new cultural themes in `src/lib/themes/cultural-themes.ts`
- Extend theme-aware components
- Cultural authenticity scoring algorithms

#### AI Service Integration
- Pluggable AI service providers
- Custom prompt templates
- Recipe validation and enhancement

#### External API Extensions
- New grocery store APIs
- Additional recipe sources
- Pricing data providers

### Configuration Files
- `next.config.js`: Image optimization, security headers
- `tailwind.config.js`: Cultural theme color system
- `tsconfig.json`: TypeScript strict mode with path aliases

### Development Patterns
- TypeScript strict mode (no `any` types)
- Cultural authenticity guidelines
- Circuit breaker implementation for all external APIs
- Comprehensive error handling and logging