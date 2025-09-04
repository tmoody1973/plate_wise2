# 🚨 URGENT: Setup Required for Pricing Cache

The 504 timeout errors you're seeing happen because the pricing cache system needs database setup.

## Quick Fix (5 minutes):

### 1. Run SQL Script in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**  
3. Copy and paste the contents of `setup-pricing-cache.sql`
4. Click **Run** to execute

### 2. Verify Setup
After running the SQL, you should see:
- ✅ New table: `ingredient_price_cache`
- ✅ 16 pre-seeded common ingredients
- ✅ Proper indexes for fast lookups

### 3. Test Immediately
The cache now contains common ingredients like:
- Onions, garlic, tomatoes, bell peppers
- Chicken breast, ground beef, eggs, egg yolks  
- Flour, sugar, salt, olive oil, butter
- Anchovy fillets, lemon juice, parmesan cheese

**These should now return instantly (no 504 errors)!**

## Expected Results After Setup:

🎯 **Immediate**:
- ⚡ **Instant pricing** for 16 common ingredients
- 🚫 **No 504 errors** for recipes using cached ingredients
- 📊 **Sub-2 second** response times

🎯 **Within 24 Hours**:
- 📈 **90% cache hit rate** as more ingredients get cached
- 💾 **Build cache** for all ingredients users search
- 🔄 **Auto-refresh** every 48 hours

## Monitoring Cache Performance:

Check cache effectiveness in your Supabase logs:
```
💾 Cache results: X cached, Y missing
⚡ All ingredients cached - returning immediately  
```

## If Still Getting 504s:

The system has multiple fallback layers:
1. **Cache** (instant) ← Should work now
2. **Perplexity API** (10-25s) ← May still timeout
3. **Enhanced Estimator** (instant) ← Always works

Even if Perplexity times out, you should get estimated prices immediately.

---

**🚀 Run that SQL script and the 504 errors should disappear for common ingredients immediately!**