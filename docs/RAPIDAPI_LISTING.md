# Publishing PriceDrop API on RapidAPI Marketplace

This guide covers the complete process of listing, configuring, and maintaining your PriceDrop API on the RapidAPI marketplace.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Prepare Your Assets](#prepare-your-assets)
3. [Create the Listing](#create-the-listing)
4. [Configure Endpoints](#configure-endpoints)
5. [Set Up Authentication](#set-up-authentication)
6. [Configure Pricing Plans](#configure-pricing-plans)
7. [Test Through RapidAPI](#test-through-rapidapi)
8. [Publish & Promote](#publish--promote)
9. [Monitor & Maintain](#monitor--maintain)

---

## 1. Prerequisites

Before starting the listing process:

### ✅ Technical Requirements
- [ ] API deployed to production (Vercel recommended)
- [ ] Custom domain or Vercel URL (e.g., `pricedrop-api.vercel.app`)
- [ ] SSL certificate enabled (https://)
- [ ] All endpoints tested and working
- [ ] Database configured (Supabase)
- [ ] Environment variables set

### ✅ Code Requirements
- [ ] RapidAPI authentication middleware enabled
```javascript
  // lib/middleware/auth.js - Should be active
  const { verifyRapidAPI } = require('../../services/rapidapi');
```

- [ ] RAPIDAPI_PROXY_SECRET environment variable set
```bash
  RAPIDAPI_PROXY_SECRET=your-unique-secret-here
```

- [ ] CORS headers properly configured
```javascript
  // lib/middleware/cors.js - Should allow RapidAPI
  res.setHeader('Access-Control-Allow-Origin', '*');
```

- [ ] Error responses standardized
```json
  {
    "success": false,
    "error": {
      "message": "...",
      "code": "..."
    },
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
```

### ✅ Documentation Requirements
- [ ] OpenAPI specification complete (`docs/openapi.yaml`)
- [ ] README with clear examples
- [ ] Postman collection available
- [ ] Pricing documentation ready

### ✅ Legal Requirements
- [ ] Terms of Service prepared
- [ ] Privacy Policy ready
- [ ] Contact information available
- [ ] Support channels established

---

## 2. Prepare Your Assets

Collect everything you'll need for the listing:

### A. Basic Information
```yaml
API Name: PriceDrop API
Tagline: Real-time e-commerce price tracking and monitoring
Category: E-commerce, Data, Business Intelligence
```

### B. Description
Use the content from `docs/SEO_DESCRIPTION.md`:

**Short Description (160 chars):**
```
Monitor product prices across eBay and Amazon. Track price drops, get instant alerts, and analyze trends with AI-powered insights.
```

**Full Description (2000+ chars):**
```
PriceDrop API is a professional-grade price tracking solution...
[Use full description from SEO_DESCRIPTION.md]
```

### C. Visual Assets

**Logo Requirements:**
- Format: PNG with transparent background
- Size: 512x512px minimum
- File size: <200KB
- Square aspect ratio

**Banner Requirements:**
- Format: PNG or JPG
- Size: 1200x400px recommended
- File size: <500KB
- Professional design with API name visible

**Screenshots:**
Prepare 3-5 screenshots showing:
1. Search results (JSON response)
2. Product details with insights
3. Price history chart data
4. Alert configuration
5. Dashboard/analytics (if available)

### D. Code Examples

Prepare code examples in multiple languages:

**cURL:**
```bash
curl -X GET "https://pricedrop-api.p.rapidapi.com/api/v1/products/search?keywords=laptop&limit=5" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: pricedrop-api.p.rapidapi.com"
```

**JavaScript (Axios):**
```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://pricedrop-api.p.rapidapi.com/api/v1/products/search',
  params: { keywords: 'laptop', limit: '5' },
  headers: {
    'X-RapidAPI-Key': 'YOUR_KEY',
    'X-RapidAPI-Host': 'pricedrop-api.p.rapidapi.com'
  }
};

axios.request(options).then(response => {
  console.log(response.data);
});
```

**Python:**
```python
import requests

url = "https://pricedrop-api.p.rapidapi.com/api/v1/products/search"
querystring = {"keywords":"laptop","limit":"5"}
headers = {
    "X-RapidAPI-Key": "YOUR_KEY",
    "X-RapidAPI-Host": "pricedrop-api.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)
print(response.json())
```

**PHP:**
```php
<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://pricedrop-api.p.rapidapi.com/api/v1/products/search?keywords=laptop&limit=5",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "X-RapidAPI-Host: pricedrop-api.p.rapidapi.com",
    "X-RapidAPI-Key: YOUR_KEY"
  ],
]);

$response = curl_exec($curl);
curl_close($curl);

echo $response;
```

---

## 3. Create the Listing

### Step-by-Step Process

#### A. Sign Up / Login
1. Go to [RapidAPI Provider Hub](https://rapidapi.com/provider)
2. Sign in or create provider account
3. Complete provider profile:
   - Name
   - Company (optional)
   - Email
   - Website
   - Bio

#### B. Create New API
1. Click **"Add New API"**
2. Choose **"External API"**
3. Enter basic information:
```
   API Name: PriceDrop API
   Base URL: https://pricedrop-api.vercel.app/api
   Short Description: Real-time e-commerce price tracking
   Category: E-commerce
```

#### C. Import OpenAPI Specification
1. Click **"Import OpenAPI File"**
2. Upload `docs/openapi.yaml`
3. Review imported endpoints
4. Fix any validation errors
5. Save specification

**Or Manually Add Endpoints:**
If import fails, add endpoints manually following this pattern:

**Example: Search Products Endpoint**
```yaml
Path: /v1/products/search
Method: GET
Parameters:
  - keywords (required, query, string)
  - limit (optional, query, integer, default: 20)
  - minPrice (optional, query, number)
  - maxPrice (optional, query, number)
Response Schema: (paste from openapi.yaml)
```

---

## 4. Configure Endpoints

### Endpoint Organization

Organize into logical groups:

**1. Discovery (Public)**
- GET `/api` - API Overview
- GET `/api/stores` - Supported Stores

**2. Core**
- GET `/api/v1/core/health` - Health Check
- GET `/api/v1/core/status` - Service Status

**3. Products**
- GET `/api/v1/products/search` - Search Products
- GET `/api/v1/products/{id}` - Get Product Details
- POST `/api/v1/products/track` - Track Product
- POST `/api/v1/products/compare` - Compare Prices

**4. Prices**
- GET `/api/v1/prices/history` - Price History
- POST `/api/v1/prices/check` - Trigger Price Check (Cron)

**5. Alerts**
- GET `/api/v1/alerts` - List Alerts
- POST `/api/v1/alerts` - Create Alert
- GET `/api/v1/alerts/{id}` - Get Alert
- PUT `/api/v1/alerts/{id}` - Update Alert
- DELETE `/api/v1/alerts/{id}` - Delete Alert

### Endpoint Configuration Best Practices

For each endpoint:

**1. Clear Description**
```
Bad: "Get products"
Good: "Search for products on eBay using keywords with optional price filters. Returns up to 100 results with pricing, seller info, and availability."
```

**2. Complete Parameter Documentation**
```yaml
parameters:
  - name: keywords
    in: query
    required: true
    schema:
      type: string
      example: "gaming laptop"
    description: "Search keywords to match product titles or descriptions"
```

**3. Response Examples**
Include both success and error examples:

**Success (200):**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "items": [...]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "message": "Keywords parameter is required",
    "code": "MISSING_KEYWORDS"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 5. Set Up Authentication

### A. Configure Authentication Type

In RapidAPI dashboard:

1. Go to **Security** section
2. Select **API Key** authentication
3. Configure headers:
```
   X-RapidAPI-Key: (automatically added by RapidAPI)
   X-RapidAPI-Host: (automatically added by RapidAPI)
   X-RapidAPI-Proxy-Secret: (verify this matches your env var)
```

### B. Verify Authentication Middleware

Ensure your authentication code checks for RapidAPI headers:
```javascript
// lib/middleware/auth.js
const authenticate = async (req, res) => {
  const apiKey = req.headers['x-rapidapi-key'];
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  
  // Verify proxy secret matches environment variable
  if (process.env.NODE_ENV === 'production') {
    if (proxySecret !== process.env.RAPIDAPI_PROXY_SECRET) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized. Access via RapidAPI only.',
          code: 'UNAUTHORIZED'
        }
      });
    }
  }
  
  // Continue with API key verification...
};
```

### C. Test Authentication Flow

Test that authentication works correctly:
```bash
# Without RapidAPI headers (should fail)
curl https://pricedrop-api.vercel.app/api/v1/products/search?keywords=test
# Expected: 401 Unauthorized

# With RapidAPI headers (should succeed)
curl https://pricedrop-api.p.rapidapi.com/api/v1/products/search?keywords=test \
  -H "X-RapidAPI-Key: test-key" \
  -H "X-RapidAPI-Host: pricedrop-api.p.rapidapi.com"
# Expected: 200 OK or proper error if test-key invalid
```

---

## 6. Configure Pricing Plans

### A. Create Pricing Tiers

Match the plans from `docs/PRICING.md`:

**BASIC (Free)**
```yaml
Name: BASIC
Price: $0/month
Description: Perfect for testing and small projects
Quota: 100 requests/month
Rate Limit: 10 requests/minute
Hard Limit: Yes (no overages)
```

**PRO**
```yaml
Name: PRO
Price: $25/month
Description: Ideal for small businesses
Quota: 1,000 requests/month
Rate Limit: 30 requests/minute
Overage: $0.03 per request
```

**ULTRA**
```yaml
Name: ULTRA
Price: $75/month
Description: For growing platforms
Quota: 10,000 requests/month
Rate Limit: 100 requests/minute
Overage: $0.008 per request
```

**MEGA**
```yaml
Name: MEGA
Price: $150/month
Description: Enterprise-grade solution
Quota: 50,000 requests/month
Rate Limit: 500 requests/minute
Overage: $0.003 per request
```

### B. Configure Rate Limiting

Ensure your rate limiter matches RapidAPI tiers:
```javascript
// config/constants.js
const RATE_LIMITS = {
  FREE: {
    requests_per_minute: 10,
    requests_per_day: 100, // ~3.3 per day average
    concurrent_tracks: 5
  },
  BASIC: {
    requests_per_minute: 10,
    requests_per_day: 100,
    concurrent_tracks: 5
  },
  PRO: {
    requests_per_minute: 30,
    requests_per_day: 1000,
    concurrent_tracks: 50
  },
  ULTRA: {
    requests_per_minute: 100,
    requests_per_day: 10000,
    concurrent_tracks: 250
  },
  MEGA: {
    requests_per_minute: 500,
    requests_per_day: 50000,
    concurrent_tracks: 1000
  }
};
```

### C. Test Rate Limits

Verify rate limiting works:
```javascript
// tests/rate-limit-test.js
const axios = require('axios');

async function testRateLimit() {
  const requests = [];
  
  // Send 15 requests rapidly (should hit 10/min limit on FREE)
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios.get('https://your-api.vercel.app/api/v1/products/search?keywords=test', {
        headers: { 'X-API-Key': 'free-tier-key' }
      }).catch(err => err.response)
    );
  }
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);
  
  console.log(`Total requests: ${responses.length}`);
  console.log(`Rate limited: ${rateLimited.length}`);
  console.log(rateLimited[0].data); // Should show RATE_LIMIT_EXCEEDED error
}

testRateLimit();
```

---

## 7. Test Through RapidAPI

### A. Subscribe to Your Own API

1. While in **Provider Dashboard**, open your API page
2. Click **"Test Endpoint"** or subscribe as a test user
3. RapidAPI will automatically add you as BASIC tier subscriber

### B. Test All Endpoints

Create a test script:
```javascript
// scripts/test-rapidapi.js
const axios = require('axios');

const BASE_URL = 'https://pricedrop-api.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_TEST_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-RapidAPI-Key': API_KEY,
    'X-RapidAPI-Host': 'pricedrop-api.p.rapidapi.com'
  }
});

async function runTests() {
  console.log('🧪 Testing via RapidAPI Gateway...\n');
  
  // Test 1: Public endpoint
  console.log('1️⃣ Testing public endpoint (no auth)...');
  const health = await axios.get(`${BASE_URL}/api/v1/core/health`);
  console.log('✅ Health:', health.data.status);
  
  // Test 2: Search (requires auth)
  console.log('\n2️⃣ Testing search...');
  const search = await client.get('/api/v1/products/search?keywords=laptop&limit=3');
  console.log('✅ Found:', search.data.data.count, 'products');
  
  // Test 3: Track product
  console.log('\n3️⃣ Testing product tracking...');
  const track = await client.post('/api/v1/products/track', {
    url: 'https://www.ebay.com/itm/123456789',
    target_price: 99.99
  });
  console.log('✅ Tracking:', track.data.data.tracking_id);
  
  // Test 4: Error handling
  console.log('\n4️⃣ Testing error handling...');
  try {
    await client.get('/api/v1/products/search'); // Missing keywords
  } catch (err) {
    console.log('✅ Error format:', err.response.data.error.code);
  }
  
  console.log('\n✨ All tests passed!');
}

runTests().catch(console.error);
```

Run with:
```bash
RAPIDAPI_TEST_KEY=your-test-key node scripts/test-rapidapi.js
```

### C. Verify Response Times

RapidAPI shows response times for each request. Aim for:
- Simple endpoints: <200ms
- Search/tracking: <500ms
- Heavy analytics: <1s

If times are high, optimize:
```javascript
// Add caching
const cache = new Map();

async function cachedSearch(keywords) {
  const cacheKey = `search:${keywords}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5 min
      return cached.data;
    }
  }
  
  const results = await ebay.searchProducts(keywords);
  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  
  return results;
}
```

---

## 8. Publish & Promote

### A. Final Pre-Launch Checklist

- [ ] All endpoints tested via RapidAPI
- [ ] Error responses consistent
- [ ] Rate limits working correctly
- [ ] Documentation complete
- [ ] Code examples tested
- [ ] Pricing clearly explained
- [ ] Support channels ready
- [ ] Terms of Service uploaded
- [ ] Privacy Policy uploaded

### B. Publish Your API

1. In Provider Dashboard, click **"Publish"**
2. Review the preview
3. Submit for RapidAPI review
4. Wait for approval (usually 24-48 hours)
5. Once approved, API goes live!

### C. Promote Your Launch

**1. Update Your Project**
```markdown
# README.md
🚀 Now available on RapidAPI!

[Subscribe on RapidAPI](https://rapidapi.com/yourusername/api/pricedrop-api)
```

**2. Social Media Announcement**
```
🎉 Excited to announce PriceDrop API is now live on @RapidAPI!

Track product prices in real-time across eBay & Amazon
📊 Historical analytics
🔔 Instant price drop alerts
💰 Free tier available

Try it now: [link]

#API #ecommerce #RapidAPI #pricetracking
```

**3. Product Hunt Launch** (optional)
- Create Product Hunt listing
- Link to RapidAPI marketplace
- Highlight free tier

**4. Dev.to Article**
Write a tutorial:
```
Title: "Building a Price Drop Alert System with PriceDrop API"
Content: Step-by-step guide showing real use case
CTA: Link to RapidAPI subscription
```

---

## 9. Monitor & Maintain

### A. Monitor Key Metrics

**Daily:**
- [ ] API uptime (should be >99%)
- [ ] Error rate (<1%)
- [ ] Average response time (<500ms)
- [ ] New subscriptions

**Weekly:**
- [ ] Total subscribers by tier
- [ ] Popular endpoints
- [ ] Common error patterns
- [ ] Support ticket trends

**Monthly:**
- [ ] Revenue and growth
- [ ] Churn rate
- [ ] Feature requests
- [ ] Competitor analysis

### B. RapidAPI Analytics Dashboard

Monitor in Provider Hub:
```
Subscribers
├── Total: 150
├── BASIC: 120
├── PRO: 25
├── ULTRA: 4
└── MEGA: 1

Usage
├── Total Requests: 45,000/month
├── Average Per User: 300
├── Peak Time: 2-4 PM UTC
└── Top Endpoints:
    1. /search (60%)
    2. /track (25%)
    3. /history (10%)

Performance
├── Avg Response: 320ms
├── P95: 850ms
├── Error Rate: 0.3%
└── Uptime: 99.8%
```

### C. Respond to Reviews & Support

**Review Management:**
- Respond to all reviews within 24 hours
- Thank positive reviewers
- Address negative feedback constructively
- Showcase improvements made based on feedback

**Support Tickets:**
- Respond within SLA (4-48 hours depending on tier)
- Escalate critical issues immediately
- Track common questions → Update docs
- Maintain professional, helpful tone

### D. Regular Updates

**Monthly:**
- Announce new features
- Share usage statistics
- Highlight interesting use cases
- Offer limited-time promotions

**Quarterly:**
- Major version updates
- New platform integrations
- API improvements
- Performance optimizations

---

## 📞 Support & Resources

- **RapidAPI Provider Support**: support@rapidapi.com
- **Documentation**: https://docs.rapidapi.com/docs/provider-quickstart
- **Community**: RapidAPI Provider Slack/Discord
- **Status Page**: https://status.rapidapi.com

---

## ✅ Success Checklist

Your API is successfully listed when:

- [x] Live on RapidAPI marketplace
- [x] All endpoints tested and working
- [x] At least 10 subscribers in first month
- [x] 99%+ uptime maintained
- [x] Average 4+ star rating
- [x] Response time <500ms
- [x] Active support channel
- [x] Regular updates announced

---

**Last Updated**: January 15, 2025  
**RapidAPI Version**: 2024  
**PriceDrop API Version**: 1.0.0