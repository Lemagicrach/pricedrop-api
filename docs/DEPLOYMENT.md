# PriceDrop API Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code should be in a GitHub repository
3. **Supabase Account**: For production database
4. **eBay Developer Account**: For eBay API access
5. **Email Service** (Optional): SendGrid, AWS SES, or SMTP server

## Environment Variables

Create `.env.local` for local development and configure these variables in Vercel for production:

### Required for Production
```bash
# Environment
NODE_ENV=production

# Database (Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# eBay API
EBAY_APP_ID=your_ebay_app_id
EBAY_ENVIRONMENT=production  # or 'sandbox' for testing

# RapidAPI Security
RAPIDAPI_PROXY_SECRET=your_rapidapi_proxy_secret
```

### Optional (Enhanced Features)
```bash
# Email Notifications
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_SECURE=false

# Amazon Affiliate (for affiliate links)
AMAZON_PARTNER_TAG=your-tag-20
AMAZON_ACCESS_KEY=your_access_key  # For PA-API (if approved)
AMAZON_SECRET_KEY=your_secret_key

# Cron Jobs
CRON_SECRET=your_cron_secret_uuid

# Error Tracking (Optional)
SENTRY_DSN=your_sentry_dsn
```

## Deployment Steps

### 1. Prepare Your Code

Ensure your code structure matches the new architecture:
```
project/
├── api/                    # Vercel serverless functions
│   ├── index.js           # Main API endpoint
│   ├── stores.js          # Supported stores
│   └── v1/
│       ├── products/
│       │   ├── search.js
│       │   ├── [id].js
│       │   ├── track.js
│       │   └── compare.js
│       ├── prices/
│       │   └── history.js
│       ├── alerts/
│       │   ├── index.js   # GET/POST alerts
│       │   └── [id].js    # GET/PUT/DELETE specific alert
│       └── core/
│           ├── health.js
│           └── status.js
│
├── lib/
│   ├── middleware/
│   │   ├── index.js       # Main exports
│   │   ├── auth.js        # Authentication
│   │   ├── cors.js        # CORS handling
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── response.js    # Response helpers
│   │   └── validation.js  # Validation helpers
│   ├── ebay.js
│   ├── amazonAffiliate.js
│   ├── scraper.js
│   └── rateLimiter.js
│
├── services/
│   ├── database.js
│   ├── supabase.js
│   ├── notifications.js
│   └── rapidapi.js
│
├── config/
│   └── constants.js
│
└── migrations/
    └── 20251015000000_complete_schema.sql
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# The CLI will prompt you to:
# 1. Link to existing project or create new one
# 2. Configure project settings
# 3. Set environment variables
```

#### Option B: GitHub Integration (Automated)
```bash
# 1. Push your code to GitHub
git add .
git commit -m "Deploy to production"
git push origin main

# 2. Go to vercel.com
# 3. Click "Import Project"
# 4. Select your GitHub repository
# 5. Configure settings:
#    - Framework Preset: Other
#    - Root Directory: ./
#    - Build Command: (leave empty)
#    - Output Directory: (leave empty)
# 6. Add environment variables
# 7. Click "Deploy"
```

### 3. Configure Environment Variables in Vercel
```bash
# Via CLI
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add EBAY_APP_ID production
vercel env add RAPIDAPI_PROXY_SECRET production

# Or via Vercel Dashboard:
# 1. Go to Project Settings
# 2. Environment Variables
# 3. Add each variable
# 4. Select "Production" environment
# 5. Click "Save"
```

### 4. Set Up Supabase Database
```bash
# 1. Create Supabase project at supabase.com
# 2. Go to SQL Editor
# 3. Run the complete schema migration:
#    Copy content from migrations/20251015000000_complete_schema.sql
# 4. Click "Run"
# 5. Verify tables created:
#    - api_users
#    - products
#    - price_history
#    - user_tracking
#    - alerts
#    - api_logs
```

### 5. Configure RapidAPI

#### A. Create API Listing
```bash
# 1. Go to rapidapi.com/provider
# 2. Click "Add New API"
# 3. Select "External API"
# 4. Enter your Vercel URL: https://your-app.vercel.app/api
# 5. Import OpenAPI spec from docs/openapi.yaml
```

#### B. Configure Authentication
```bash
# In RapidAPI dashboard:
# 1. Authentication Type: Header
# 2. Required Headers:
#    - X-RapidAPI-Key (automatic)
#    - X-RapidAPI-Host (automatic)
#    - X-RapidAPI-Proxy-Secret (from your env vars)
```

#### C. Set Up Pricing Plans
```bash
# Create tiers matching docs/PRICING.md:
# - BASIC (Free): 100 req/month, 10 req/min
# - PRO ($25): 1,000 req/month, 30 req/min
# - ULTRA ($75): 10,000 req/month, 100 req/min
# - MEGA ($150): 50,000 req/month, 500 req/min
```

### 6. Set Up Cron Jobs (Optional)

For automated price checks:

#### Option A: Vercel Cron (Recommended)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/v1/prices/check",
      "schedule": "0 */1 * * *"  // Every hour
    }
  ]
}
```

#### Option B: GitHub Actions
```yaml
# .github/workflows/price-check.yml
name: Scheduled Price Check
on:
  schedule:
    - cron: '0 */1 * * *'  # Every hour
  workflow_dispatch:

jobs:
  price-check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Price Check
        run: |
          curl -X POST https://your-app.vercel.app/api/v1/prices/check \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Testing Your Deployment

### 1. Test Public Endpoints
```bash
# Health check (no auth required)
curl https://your-app.vercel.app/api/v1/core/health

# API info (no auth required)
curl https://your-app.vercel.app/api

# Supported stores (no auth required)
curl https://your-app.vercel.app/api/stores
```

### 2. Test Protected Endpoints
```bash
# Search products (requires RapidAPI key)
curl -X GET "https://your-app.vercel.app/api/v1/products/search?keywords=laptop&limit=5" \
  -H "X-RapidAPI-Key: your-key-here" \
  -H "X-RapidAPI-Host: your-app.vercel.app"

# Track product
curl -X POST https://your-app.vercel.app/api/v1/products/track \
  -H "Content-Type: application/json" \
  -H "X-RapidAPI-Key: your-key-here" \
  -H "X-RapidAPI-Host: your-app.vercel.app" \
  -d '{
    "url": "https://www.ebay.com/itm/123456789",
    "target_price": 99.99,
    "notify_on_drop": true,
    "email": "user@example.com"
  }'
```

### 3. Verify Database Connection
```bash
# Run the verification script
node scripts/verify-database.js

# Expected output:
# ✅ Products table with platform column... PASSED
# ✅ Insert product with platform... PASSED
# ✅ Price history table... PASSED
# ✅ API users table... PASSED
```

### 4. Test New Middleware Structure
```bash
# Test response format consistency
curl https://your-app.vercel.app/api | jq '.success'
# Should return: true

# Test error handling
curl https://your-app.vercel.app/api/v1/products/search
# Should return 400 with proper error format:
# {
#   "success": false,
#   "error": {
#     "message": "Keywords required",
#     "code": "MISSING_KEYWORDS"
#   },
#   "timestamp": "2025-01-15T..."
# }
```

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database schema deployed successfully
- [ ] Public endpoints accessible
- [ ] Protected endpoints require authentication
- [ ] Error responses use consistent format
- [ ] CORS headers working correctly
- [ ] Rate limiting functional
- [ ] Email notifications working (if configured)
- [ ] Cron jobs scheduled (if using)
- [ ] Monitoring/logging enabled
- [ ] RapidAPI listing published
- [ ] Documentation updated with production URLs

## Monitoring & Logging

### Vercel Analytics
```bash
# Enable in Project Settings → Analytics
# Monitor:
# - Function invocations
# - Response times
# - Error rates
# - Bandwidth usage
```

### Supabase Logs
```bash
# Monitor database queries:
# 1. Go to Supabase Dashboard
# 2. Logs → Database
# 3. Set up alerts for slow queries
```

### Error Tracking (Optional)
```bash
# If using Sentry:
# 1. Add SENTRY_DSN to environment variables
# 2. Errors automatically captured by errorHandler middleware
# 3. View in Sentry dashboard
```

## Performance Optimization

### 1. Enable Edge Functions
```json
// vercel.json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

### 2. Add Response Caching
```javascript
// For public endpoints
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
```

### 3. Database Indexing
```sql
-- Already included in migration, but verify:
EXPLAIN ANALYZE SELECT * FROM products WHERE url = 'example.com';
-- Should use idx_products_url index
```

## Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
# Solution: Ensure all imports use relative paths
# ✅ Good: require('../../../lib/middleware')
# ❌ Bad: require('lib/middleware')
```

**2. CORS errors**
```bash
# Solution: Check corsMiddleware is applied to all routes
# Verify: res.getHeaders()['access-control-allow-origin']
```

**3. Database connection timeout**
```bash
# Solution: Check Supabase URL and key
# Test: node -e "console.log(process.env.SUPABASE_URL)"
```

**4. RapidAPI authentication failing**
```bash
# Solution: Verify RAPIDAPI_PROXY_SECRET matches
# Test auth middleware: node scripts/test-endpoints.js
```

**5. "Function execution timeout"**
```bash
# Solution: Increase maxDuration in vercel.json
# Or optimize slow database queries
```

### Debug Mode

Enable detailed logging:
```bash
# Add to .env.local
NODE_ENV=development
DEBUG=true

# Middleware will log all requests:
# [Middleware] Auth check: { user: {...}, plan: 'PRO' }
# [Middleware] CORS applied
# [Middleware] Error caught: ValidationError
```

## Rollback Strategy

If deployment fails:
```bash
# Via Vercel CLI
vercel rollback

# Or via Dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "⋯" → Promote to Production
```

## Security Best Practices

1. **Never commit secrets**
```bash
   # Verify .gitignore includes:
   .env*
   !.env.example
```

2. **Rotate API keys regularly**
```bash
   # Every 90 days, update:
   # - RAPIDAPI_PROXY_SECRET
   # - CRON_SECRET
   # - Database credentials
```

3. **Monitor for unusual activity**
```bash
   # Set up alerts for:
   # - Sudden traffic spikes
   # - Unusual error rates
   # - Failed authentication attempts
```

4. **Use principle of least privilege**
```bash
   # Supabase: Use service_role key only for admin operations
   # Production: Use anon key with RLS policies
```

## Support Resources

- **Documentation**: https://your-app.vercel.app/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **RapidAPI Docs**: https://docs.rapidapi.com
- **GitHub Issues**: https://github.com/yourusername/pricedrop-api/issues
- **Email Support**: support@pricedrop-api.com

## Next Steps

1. Monitor initial traffic and error rates
2. Gather user feedback
3. Optimize slow endpoints
4. Add more supported stores
5. Implement advanced features (webhooks, bulk operations)
6. Consider adding GraphQL endpoint
7. Expand to more regions/currencies

---

**Last Updated**: January 15, 2025
**Deployment Version**: 1.0.0
**Minimum Node Version**: 18.x