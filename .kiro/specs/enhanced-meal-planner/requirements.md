# Enhanced Meal Planner Requirements Document

## Introduction

The Enhanced Meal Planner is a focused enhancement to PlateWise's existing meal planning capabilities, implementing a sophisticated two-stage meal plan generation system. This enhancement leverages Perplexity AI for intelligent recipe discovery and WebScraping.AI for comprehensive recipe data extraction, creating highly structured meal plans that honor cultural preferences, dietary restrictions, and budget constraints while providing rich recipe details and accurate nutritional information.

## Requirements

### Requirement 1: Two-Stage Structured Meal Plan Generation with Formal Contracts

**User Story:** As a user planning meals for my family, I want an intelligent system that first discovers culturally appropriate recipes within my constraints, then enriches them with detailed information, so that I get comprehensive meal plans with complete recipe data.

#### Acceptance Criteria

1. WHEN a user requests a meal plan THEN the system SHALL execute Stage 1 using Perplexity API with response_format: { type: "json_schema" } and model temperature ≤ 0.3 to return exactly N recipe URLs
2. WHEN Stage 1 returns data THEN it MUST conform to the contract: { "recipes": [{ "title": "string", "sourceUrl": "uri", "imageUrl": "uri", "totalTimeMinutes": 1, "cuisine": "string" }] }
3. WHEN JSON Schema validation fails THEN the system SHALL retry once with the same schema before failing
4. WHEN Stage 1 completes THEN the system SHALL filter results by user profile including diet preferences, cultural cuisine, time constraints, pantry items, and excluded ingredients
5. WHEN Stage 2 begins THEN the system SHALL call WebScraping.AI /ai/fields endpoint for each URL with field priority order: JSON-LD Recipe → Open Graph/H1
6. WHEN WebScraping.AI returns thin data THEN the system SHALL fallback to /html endpoint and parse JSON-LD Recipe schema from <script type="application/ld+json"> including support for HowToStep.text
7. WHEN Stage 2 completes THEN each normalized record MUST return: { title, ingredients[], instructions[], servings:int, totalTimeMinutes?:int, sourceUrl (canonical if present), imageUrl (absolute HTTPS), yieldText?:string }

### Requirement 2: Advanced Recipe URL Discovery and Filtering

**User Story:** As someone with specific cultural and dietary needs, I want the system to discover recipes that truly match my preferences and constraints, so that every suggested recipe is relevant and appropriate for my family.

#### Acceptance Criteria

1. WHEN generating recipe URLs THEN the system SHALL use Perplexity's structured output capabilities to ensure exactly N URLs are returned in valid JSON format
2. WHEN filtering by cultural preferences THEN the system SHALL prioritize authentic recipes from selected cultural cuisines while maintaining budget constraints
3. WHEN applying dietary restrictions THEN the system SHALL exclude recipes containing restricted ingredients and allergens
4. WHEN considering time constraints THEN the system SHALL filter recipes by maximum preparation and cooking time limits
5. WHEN checking pantry items THEN the system SHALL prioritize recipes that utilize ingredients the user already has
6. WHEN processing exclusion lists THEN the system SHALL eliminate recipes containing any ingredients the user wants to avoid

### Requirement 3: Comprehensive Recipe Data Extraction and Enrichment

**User Story:** As a home cook following meal plans, I want complete recipe information including detailed ingredients, clear instructions, and accurate serving sizes, so that I can successfully prepare every meal.

#### Acceptance Criteria

1. WHEN calling WebScraping.AI /ai/fields THEN the system SHALL extract title, image URL, ingredients list, cooking instructions, and serving count
2. WHEN /ai/fields returns insufficient data THEN the system SHALL automatically fallback to /html endpoint for raw HTML parsing
3. WHEN parsing HTML THEN the system SHALL extract JSON-LD Recipe schema data including recipeIngredient, recipeInstructions, recipeYield, image, and name
4. WHEN processing ingredients THEN the system SHALL handle both array formats and blob text, splitting blobs by lines and bullet points
5. WHEN normalizing instructions THEN the system SHALL convert both structured arrays and paragraph text into clear step-by-step format
6. WHEN determining servings THEN the system SHALL use lower-bound values for ranges (e.g., "4-6 servings" becomes 4) and default to reasonable estimates when missing

### Requirement 4: Intelligent Data Normalization and Quality Assurance with Canonical Rules

**User Story:** As a user receiving meal plans, I want consistent, clean, and accurate recipe data regardless of the source website's format, so that I can rely on the information for shopping and cooking.

#### Acceptance Criteria

1. WHEN normalizing ingredient lists THEN the system SHALL deduplicate identical ingredients and consolidate similar items
2. WHEN processing cooking times THEN the system SHALL default to 30 minutes when time information is missing or unclear
3. WHEN handling source URLs THEN the system SHALL prefer <link rel="canonical"> for sourceUrl; if absent, use final resolved URL
4. WHEN processing image URLs THEN the system SHALL prefer og:image and require ≥1200×630 when available; always absolutize to HTTPS
5. WHEN cleaning recipe titles THEN the system SHALL remove promotional text and standardize formatting
6. WHEN validating serving sizes THEN the system SHALL ensure realistic serving counts between 1-12 people with appropriate defaults
7. WHEN ensuring data integrity THEN the system SHALL apply hard gates: reject meals where ingredients < 3 or instructions < 6

### Requirement 5: Cultural Authenticity and Accessibility Standards

**User Story:** As someone who values both cultural authenticity and accessible information, I want meal plans that respect my heritage while being clearly presented for users of all ages and technical backgrounds, so that I can maintain my traditions with confidence.

#### Acceptance Criteria

1. WHEN generating culturally-focused meal plans THEN the system SHALL prioritize authentic recipes from traditional sources and cultural cooking websites
2. WHEN cultural ingredients are featured THEN the system SHALL preserve traditional ingredient names and cooking methods in extracted data
3. WHEN suggesting alternatives THEN the system SHALL maintain cultural authenticity while offering budget-friendly substitutions
4. WHEN displaying cultural recipes THEN the system SHALL include cultural context and significance information when available
5. WHEN presenting UI copy and outputs THEN the system SHALL meet WCAG 2.2 AA standards with plain-language guidance (short sentences, headings, bullets; convert percentages to frequencies when helpful, e.g., "10% (1 in 10)")
6. WHEN providing nutritional information THEN nutrition values MUST be fetched or checked against USDA FoodData Central (FDC) via its public API with cached lookups per ingredient alias map

### Requirement 6: Meal Plan Artifact Management with Observability

**User Story:** As a developer and user of the system, I want clear data flow and artifact management with guaranteed quality output and full observability, so that meal plan generation is transparent, debuggable, and produces reliable results.

#### Acceptance Criteria

1. WHEN meal plan generation begins THEN the system SHALL read user preferences from /data/plan-request.json artifact
2. WHEN Stage 1 completes THEN the system SHALL persist stage1.json (the URL list) alongside plan.json for traceability
3. WHEN Stage 2 completes THEN the system SHALL write final meal plan to /data/plan.json where meals.length equals mealsTarget exactly
4. WHEN validating meal quality THEN each meal SHALL have non-empty title, canonical source URL, og:image imageUrl, numeric servings, at least 6 instruction steps, and at least 3 key ingredients
5. WHEN ensuring data integrity THEN the system SHALL reject meals with "Untitled recipe" titles, empty ingredients lists, or missing critical data
6. WHEN emitting metrics THEN the system SHALL track Stage-1 and Stage-2 p50/p95 latency, success rate, % of pages where JSON-LD was used, % with canonical present, % with valid imageUrl
7. WHEN logging operations THEN the system SHALL emit structured logs with one event per URL including: source domain, chosen extraction path (AI-Fields vs JSON-LD), counts of ingredients/steps, fallbacks triggered
8. WHEN testing the pipeline THEN setting mealsTarget=3 and running the complete pipeline SHALL produce exactly 3 validated meals in /data/plan.json

### Requirement 7: Performance and Reliability with Concrete Policies

**User Story:** As a user generating meal plans, I want fast, reliable results even when external services are slow or unavailable, so that I can depend on the system for my meal planning needs.

#### Acceptance Criteria

1. WHEN making HTTP requests THEN the system SHALL use timeouts: connect=3s, read=10s, total=13s per request
2. WHEN requests fail THEN the system SHALL retry up to 3 times with exponential backoff + jitter, capped at 10s; abort on HTTP 4xx except 429
3. WHEN encountering 429 rate limits THEN the system SHALL honor Retry-After headers and apply client-side rate limiting
4. WHEN processing multiple recipes THEN the system SHALL scrape at most 3-5 pages in parallel to avoid overwhelming servers
5. WHEN WebScraping.AI fails THEN the system SHALL gracefully fallback to alternative extraction methods
6. WHEN Perplexity API is unavailable THEN the system SHALL provide cached or alternative recipe suggestions

## Phase 2 Requirements (Future Enhancements)

*Note: These requirements require stable Stage-1/Stage-2 success rate ≥ 95% for 30 days before implementation.*

### Requirement 8: Enhanced Recipe Search and Discovery (Phase 2)

**User Story:** As a user exploring recipe options, I want powerful search capabilities that understand my cultural preferences and dietary needs, so that I can discover new recipes that fit my lifestyle.

#### Acceptance Criteria

1. WHEN searching for recipes THEN the system SHALL provide enhanced search with cultural cuisine filters, dietary restriction options, and ingredient-based queries
2. WHEN displaying search results THEN the system SHALL show recipe previews with cultural tags, difficulty ratings, and estimated costs
3. WHEN refining searches THEN the system SHALL allow users to adjust filters and see results update in real-time
4. WHEN saving searches THEN the system SHALL allow users to bookmark search criteria for future meal plan generation
5. WHEN exploring cuisines THEN the system SHALL provide cultural cuisine discovery with authentic recipe recommendations

### Requirement 9: Ingredient Classification and Pantry Integration (Phase 2)

**User Story:** As someone managing my pantry and shopping lists, I want intelligent ingredient classification and pantry management, so that meal plans account for what I already have and optimize my shopping.

#### Acceptance Criteria

1. WHEN analyzing ingredients THEN the system SHALL classify them by category (proteins, vegetables, grains, spices, etc.) and cultural significance
2. WHEN checking pantry items THEN the system SHALL match recipe ingredients against user's pantry inventory
3. WHEN generating shopping lists THEN the system SHALL exclude pantry items and group remaining ingredients by store section
4. WHEN suggesting substitutions THEN the system SHALL recommend pantry-based alternatives that maintain recipe integrity
5. WHEN tracking usage THEN the system SHALL update pantry quantities based on meal plan consumption

### Requirement 10: Store Integration and Shopping Optimization (Phase 2)

**User Story:** As a budget-conscious shopper, I want meal plans that integrate with local store information and pricing, so that I can optimize my grocery shopping and spending.

#### Acceptance Criteria

1. WHEN generating meal plans THEN the system SHALL integrate with store discovery to find local grocery stores and specialty markets
2. WHEN calculating costs THEN the system SHALL use real-time pricing data from integrated store APIs
3. WHEN optimizing shopping THEN the system SHALL suggest the most cost-effective store combinations for complete shopping lists
4. WHEN cultural ingredients are needed THEN the system SHALL identify specialty stores and ethnic markets that carry authentic ingredients
5. WHEN comparing options THEN the system SHALL show cost differences between different store combinations and ingredient alternatives

## Additional Testing Requirements

### Cross-Site End-to-End Matrix
- WHEN testing across publishers THEN the system SHALL prove functionality on at least 5 publishers (one JS-heavy)
- WHEN measuring success rates THEN expect ≥95% recipes with non-empty ingredients & ≥6 steps after fallbacks

### Structured Outputs Health Check
- WHEN receiving Perplexity responses THEN reject responses that are not valid JSON against the schema
- WHEN validation fails THEN log the failure and retry once before final failure