<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
Intent: Build meal plans in two stages.
Stage 1 (Perplexity): Return exactly N recipe URLs using Structured Outputs (JSON Schema) filtered by user profile (diet, culture, time, pantry, exclude).
Stage 2 (WebScraping.AI): For each URL, call /ai/fields to get title, image, ingredients, instructions, servings; if thin, fallback to /html and parse JSON-LD Recipe (recipeIngredient, recipeInstructions, recipeYield, image, name).
Normalization: Accept arrays or blobs, split blobs by lines/bullets, dedupe, lower-bound servings for ranges, default time=30, prefer canonical URL and og:image, force absolute HTTPS.
Artifacts: read /data/plan-request.json; write /data/plan.json.

API References: 
- Perplexity Full API: #[[file:docs/perplexity_full_api.md]]
- Production Patterns: #[[file:.kiro/steering/perplexity-api-guide.md]]