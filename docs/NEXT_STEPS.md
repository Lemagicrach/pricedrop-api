# Post-Deployment & Development Checklist

This comprehensive checklist ensures the PriceDrop API remains reliable, maintainable, and well-documented after implementing new features, fixes, or refactoring. Follow this checklist before each deployment or pull request.

## 📋 Table of Contents

- [1. Code Quality Verification](#1-code-quality-verification)
- [2. API Behavior Validation](#2-api-behavior-validation)
- [3. Middleware & Architecture](#3-middleware--architecture)
- [4. Documentation Updates](#4-documentation-updates)
- [5. Database & Services](#5-database--services)
- [6. Deployment Preparation](#6-deployment-preparation)
- [7. Post-Deployment Monitoring](#7-post-deployment-monitoring)

---

## 1. Code Quality Verification

### Automated Checks
- [ ] **Run all tests**: `npm test`
```bash
  # Should see: All tests passed
  # If any fail, fix before proceeding
```

- [ ] **Check for TypeScript errors** (if applicable): `npm run build`
```bash
  # No compilation errors should appear
```

- [ ] **Lint the codebase**: `npm run lint`
```bash
  # Fix all errors, warnings are acceptable if documented
```

- [ ] **Format code consistently**: `npm run format` (if using Prettier)

### Manual Code Review
- [ ] **Review imports**
  - [ ] All imports use relative paths correctly
  - [ ] No circular dependencies
  - [ ] Unused imports removed

- [ ] **Check for secrets exposure**
  - [ ] No API keys, passwords, or tokens in code
  - [ ] `.env*` files properly ignored in `.gitignore`
  - [ ] No sensitive data in comments or console.logs

- [ ] **Verify error handling**
  - [ ] All async functions wrapped properly
  - [ ] Custom error classes used consistently
  - [ ] No silent failures (errors logged or thrown)

---

## 2. API Behavior Validation

### Local Testing
- [ ] **Start development server**: `npm run dev`
```bash
  # Server should start on http://localhost:3000
  # No errors in console
```

- [ ] **Test public endpoints** (no auth required)
```bash
  # API info
  curl http://localhost:3000/api
  
  # Health check
  curl http://localhost:3000/api/v1/core/health
  
  # Supported stores
  curl http://localhost:3000/api/stores
```

- [ ] **Test protected endpoints** (with test key)
```bash
  # Search products
  curl -X GET "http://localhost:3000/api/v1/products/search?keywords=laptop" \
    -H "X-API-Key: test-key"
  
  # Track product
  curl -X POST http://localhost:3000/api/v1/products/track \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-key" \
    -d '{"url":"https://www.ebay.com/itm/123456789","target_price":99.99}'
```

- [ ] **Verify response formats**
  - [ ] All successful responses have `success: true`
  - [ ] All include `timestamp` field
  - [ ] Data is in `data` object
  - [ ] Errors use consistent format:
```json
    {
      "success": false,
      "error": {
        "message": "...",
        "code": "..."
      },
      "timestamp": "..."
    }
```

### Response Schema Validation
- [ ] **Compare responses with OpenAPI spec**
```bash
  # Use tools like swagger-cli or openapi-validator
  npx swagger-cli validate docs/openapi.yaml
```

- [ ] **Test pagination** (if applicable)
  - [ ] `limit` and `offset` working
  - [ ] `total`, `page`, `pages` calculated correctly
  - [ ] `hasNext` and `hasPrev` accurate

- [ ] **Test error cases**
  - [ ] Missing required fields → 400 Bad Request
  - [ ] Invalid API key → 401 Unauthorized
  - [ ] Resource not found → 404 Not Found
  - [ ] Rate limit exceeded → 429 Too Many Requests
  - [ ] Server errors → 500 Internal Server Error

---

## 3. Middleware & Architecture

### Middleware Validation
- [ ] **Test middleware chain**
```bash
  # Create test file: tests/middleware-flow.test.js
  node tests/middleware-flow.test.js
```

- [ ] **Verify CORS headers**
```bash
  curl -I http://localhost:3000/api
  # Should include:
  # Access-Control-Allow-Origin: *
  # Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

- [ ] **Test authentication flow**
  - [ ] Valid key → Request proceeds
  - [ ] Invalid key → 401 Unauthorized
  - [ ] Missing key → 401 Unauthorized
  - [ ] Rate limit enforced per plan

- [ ] **Test error handler**
```javascript
  // Trigger intentional error
  curl http://localhost:3000/api/v1/products/nonexistent
  // Should return 404 with proper error format
```

### Architecture Checks
- [ ] **Verify file structure matches**
```
  ✅ lib/middleware/index.js exists
  ✅ lib/middleware/auth.js exists
  ✅ lib/middleware/cors.js exists
  ✅ lib/middleware/errorHandler.js exists
  ✅ lib/utils/response.js exists
```

- [ ] **Check exports**
```javascript
  // Test imports
  const { protectedRoute } = require('./lib/middleware');
  const { success, error } = require('./lib/utils/response');
```

- [ ] **Validate service layer**
  - [ ] Database service handles null/undefined gracefully
  - [ ] All async operations have timeout handling
  - [ ] Connection pooling configured (if applicable)

---

## 4. Documentation Updates

### API Documentation
- [ ] **Update OpenAPI spec** (`docs/openapi.yaml`)
  - [ ] New endpoints added
  - [ ] Request/response schemas updated
  - [ ] Error responses documented
  - [ ] Examples include realistic data

- [ ] **Update Postman collection** (`docs/pricedrop-api.postman_collection.js`)
  - [ ] New endpoints added
  - [ ] Environment variables updated
  - [ ] Request examples include all required fields

### Code Documentation
- [ ] **Update README.md**
  - [ ] Installation instructions current
  - [ ] Quick start examples work
  - [ ] Environment variables documented
  - [ ] API endpoints list complete

- [ ] **Update inline comments**
  - [ ] Complex logic explained
  - [ ] TODOs marked clearly
  - [ ] Deprecated code flagged

- [ ] **Update CHANGELOG.md** (if exists)
```markdown
  ## [1.1.0] - 2025-01-15
  ### Added
  - New alerts endpoint with split structure
  - Response helper utilities
  
  ### Changed
  - Refactored middleware into separate files
  - Updated error response format
  
  ### Fixed
  - Memory leak in rate limiter
```

### Partner Documentation
- [ ] **Update RapidAPI listing**
  - [ ] Description reflects new features
  - [ ] Code examples updated
  - [ ] Pricing tiers accurate

- [ ] **Update external integrations**
  - [ ] Webhook payload formats
  - [ ] Callback URL requirements
  - [ ] Rate limit notifications

---

## 5. Database & Services

### Database Checks
- [ ] **Verify schema up-to-date**
```bash
  node scripts/verify-database.js
  # All tables should exist
  # All columns should match schema
```

- [ ] **Test database operations**
```javascript
  // Run database tests
  npm run test:db
  
  // Or manually:
  node -e "
    const { createProduct, getProduct } = require('./services/database');
    // Test create and retrieve
  "
```

- [ ] **Check migrations**
  - [ ] Migration file generated if schema changed
  - [ ] Migration tested on clean database
  - [ ] Rollback strategy documented

### Service Integration
- [ ] **Test external APIs**
  - [ ] eBay API credentials valid
  - [ ] Response parsing handles all edge cases
  - [ ] Error handling for API downtime

- [ ] **Test notification service**
  - [ ] Email delivery working (if configured)
  - [ ] Webhook calls succeed (if configured)
  - [ ] Retry logic functioning

- [ ] **Test scraper**
```bash
  node -e "
    const { scrapePrice } = require('./lib/scraper');
    scrapePrice('https://www.ebay.com/itm/123456789')
      .then(console.log);
  "
```

---

## 6. Deployment Preparation

### Pre-Deployment
- [ ] **Merge conflicts resolved**
- [ ] **Branch up-to-date with main**
```bash
  git fetch origin
  git rebase origin/main
```

- [ ] **Version bumped** (if applicable)
```bash
  npm version patch  # 1.0.0 → 1.0.1
  npm version minor  # 1.0.0 → 1.1.0
  npm version major  # 1.0.0 → 2.0.0
```

- [ ] **Dependencies audit**
```bash
  npm audit
  # Fix any critical or high vulnerabilities
  npm audit fix
```

### Deployment Validation
- [ ] **Environment variables set**
```bash
  # Verify in Vercel dashboard
  # Or via CLI:
  vercel env ls
```

- [ ] **Build succeeds locally**
```bash
  NODE_ENV=production npm run build
  # Should complete without errors
```

- [ ] **Smoke test in staging** (if available)
```bash
  # Test against staging URL
  curl https://staging.your-app.vercel.app/api/v1/core/health
```

### Deployment Checklist
- [ ] **Create deployment PR**
  - [ ] Clear title and description
  - [ ] Linked to relevant issues
  - [ ] Screenshots/examples included
  - [ ] Breaking changes highlighted

- [ ] **Get code review approval**

- [ ] **Deploy to production**
```bash
  vercel --prod
  # Or merge to main (if auto-deploy enabled)
```

---

## 7. Post-Deployment Monitoring

### Immediate Checks (First 10 minutes)
- [ ] **Verify deployment successful**
```bash
  curl https://your-app.vercel.app/api/v1/core/health
  # Should return: "status": "healthy"
```

- [ ] **Test critical endpoints**
  - [ ] Search products working
  - [ ] Track product working
  - [ ] Alerts CRUD working
  - [ ] Price history working

- [ ] **Check error rates**
```bash
  # In Vercel dashboard:
  # Functions → View logs
  # Should see no 5xx errors
```

### First Hour Monitoring
- [ ] **Monitor Vercel Analytics**
  - [ ] Response times normal (<1s for most endpoints)
  - [ ] No spike in errors
  - [ ] Function invocations within expected range

- [ ] **Monitor Supabase**
  - [ ] Database connections stable
  - [ ] No slow queries
  - [ ] No connection pool exhaustion

- [ ] **Check RapidAPI metrics** (if listed)
  - [ ] API calls succeeding
  - [ ] No unusual error patterns
  - [ ] Rate limits working correctly

### First 24 Hours
- [ ] **Review logs for patterns**
```bash
  # Check for:
  # - Repeated errors
  # - Unusual traffic
  # - Performance degradation
```

- [ ] **User feedback**
  - [ ] Monitor support channels
  - [ ] Check GitHub issues
  - [ ] Review RapidAPI comments/ratings

- [ ] **Performance baseline**
  - [ ] Document average response times
  - [ ] Note typical error rate
  - [ ] Record daily request volume

---

## 🎯 Quick Reference

### Must-Have Before Every Deployment
1. ✅ All tests pass
2. ✅ No linting errors
3. ✅ Public endpoints tested
4. ✅ Protected endpoints tested
5. ✅ Documentation updated
6. ✅ Environment variables set
7. ✅ Database schema current

### Common Gotchas
- Forgetting to update OpenAPI spec
- Missing environment variables in production
- Database migrations not run
- Response format inconsistencies
- CORS misconfiguration
- Rate limiter memory leaks

### Emergency Rollback
```bash
# If critical issue found post-deployment:
vercel rollback

# Or via dashboard:
# Deployments → Previous → Promote to Production
```

---

## 📞 Support & Escalation

### When to Halt Deployment
- Critical bugs in production
- Data integrity issues
- Security vulnerabilities
- >5% error rate
- Complete service outage

### Who to Contact
- **Technical Issues**: Create GitHub issue
- **Database Problems**: Check Supabase status page
- **RapidAPI Issues**: Contact RapidAPI support
- **Critical Outages**: Email team immediately

---

**Remember**: It's better to catch issues during this checklist than after deployment. Take your time and check everything systematically.

**Last Updated**: January 15, 2025
**Checklist Version**: 2.0