# RapidAPI Import Guide

## Step-by-Step Guide to List Your API on RapidAPI

This guide will walk you through importing your custom OpenAPI specification to RapidAPI and configuring your API for monetization.

## Prerequisites

1. **Vercel Deployment**: Your API must be deployed and accessible at a public URL
2. **RapidAPI Account**: Sign up at https://rapidapi.com/provider if you haven't already
3. **OpenAPI File**: Use the `openapi-rapidapi.yaml` file we just created

## Step 1: Deploy Your API to Vercel

Before listing on RapidAPI, ensure your API is live:

```bash
# Make sure environment variables are set in Vercel dashboard
# Required: EBAY_APP_ID, EBAY_ENVIRONMENT

# Your API should be accessible at:
https://pricedrop-api.vercel.app
```

**Test your deployment:**
```bash
curl https://pricedrop-api.vercel.app/api/v1/core/health
```

## Step 2: Access RapidAPI Provider Hub

1. Go to https://rapidapi.com/provider
2. Sign in or create a provider account
3. Click **"Add New API"** button

## Step 3: Import OpenAPI Specification

### Method 1: File Upload (Recommended)

1. In the "Add New API" form, select **"Import from OpenAPI/Swagger"**
2. Click **"Upload File"**
3. Select `openapi-rapidapi.yaml` from your repository
4. Click **"Import"**

### Method 2: URL Import

1. First, push the OpenAPI file to GitHub:
   ```bash
   cd /path/to/pricedrop-api
   git add openapi-rapidapi.yaml RAPIDAPI_IMPORT_GUIDE.md
   git commit -m "Add custom OpenAPI spec for RapidAPI import"
   git push origin main
   ```

2. Get the raw file URL:
   ```
   https://raw.githubusercontent.com/Lemagicrach/pricedrop-api/main/openapi-rapidapi.yaml
   ```

3. In RapidAPI, select **"Import from URL"**
4. Paste the raw GitHub URL
5. Click **"Import"**

## Step 4: Configure Basic Information

After import, verify and update:

### API Details
- **Name**: PriceDrop API - Real-Time E-commerce Price Tracking
- **Category**: E-commerce, Data, Tools
- **Short Description**: Monitor product prices, track drops, get alerts
- **Full Description**: (Already included in OpenAPI spec)

### Base URL
- **Production**: `https://pricedrop-api.vercel.app`
- Verify this matches your Vercel deployment

### Tags/Keywords
Add these for better discoverability:
```
price tracking, e-commerce, price monitoring, price alerts, 
ebay api, amazon api, price comparison, deal finder, 
shopping assistant, market research, price history
```

## Step 5: Configure Authentication

RapidAPI automatically configures authentication, but verify:

1. Go to **"Security"** tab
2. Confirm **RapidAPI Key** authentication is enabled
3. Your API will receive these headers:
   - `X-RapidAPI-Key`: User's API key
   - `X-RapidAPI-Host`: Your API host
   - `X-RapidAPI-Proxy-Secret`: RapidAPI proxy secret (optional)

**Update your middleware** to accept RapidAPI headers:
```javascript
// Already implemented in lib/middleware.js
const rapidApiKey = req.headers['x-rapidapi-key'];
const rapidApiHost = req.headers['x-rapidapi-host'];
```

## Step 6: Set Up Pricing Plans

Navigate to **"Monetization"** tab and create 4 pricing tiers:

### BASIC (Free Tier)
- **Name**: BASIC
- **Price**: $0.00/month
- **Hard Limit**: 100 requests/month
- **Rate Limit**: 10 requests/minute
- **Description**: Perfect for testing and evaluation
- **Features**:
  - Product search (eBay only)
  - Basic product details
  - Public health check
  - Community support

### PRO Tier
- **Name**: PRO
- **Price**: $25.00/month
- **Hard Limit**: 1,000 requests/month
- **Rate Limit**: 30 requests/minute
- **Overage**: $0.03 per request
- **Description**: Ideal for small businesses and active developers
- **Features**:
  - All BASIC features
  - Product tracking
  - Email price alerts
  - 30-day price history
  - 15-minute check frequency

### ULTRA Tier
- **Name**: ULTRA
- **Price**: $75.00/month
- **Hard Limit**: 10,000 requests/month
- **Rate Limit**: 100 requests/minute
- **Overage**: $0.008 per request
- **Description**: For growing businesses with higher demands
- **Features**:
  - All PRO features
  - Webhook notifications
  - 90-day price history
  - 5-minute check frequency
  - Advanced insights

### MEGA Tier
- **Name**: MEGA
- **Price**: $150.00/month
- **Hard Limit**: 50,000 requests/month
- **Rate Limit**: 500 requests/minute
- **Overage**: $0.003 per request
- **Description**: Enterprise-grade solution
- **Features**:
  - All ULTRA features
  - Unlimited price history
  - 1-minute check frequency
  - 99.9% SLA
  - Dedicated support

## Step 7: Add Code Examples

RapidAPI auto-generates code examples, but you can customize them:

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://pricedrop-api.vercel.app/api/v1/products/search',
  params: {
    query: 'iPhone 15 Pro',
    minPrice: '100',
    maxPrice: '1500'
  },
  headers: {
    'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
    'X-RapidAPI-Host': 'pricedrop-api.vercel.app'
  }
};

try {
  const response = await axios.request(options);
  console.log(response.data);
} catch (error) {
  console.error(error);
}
```

### Python Example
```python
import requests

url = "https://pricedrop-api.vercel.app/api/v1/products/search"

querystring = {
    "query": "iPhone 15 Pro",
    "minPrice": "100",
    "maxPrice": "1500"
}

headers = {
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "pricedrop-api.vercel.app"
}

response = requests.get(url, headers=headers, params=querystring)
print(response.json())
```

### cURL Example
```bash
curl --request GET \
  --url 'https://pricedrop-api.vercel.app/api/v1/products/search?query=iPhone%2015%20Pro&minPrice=100&maxPrice=1500' \
  --header 'X-RapidAPI-Host: pricedrop-api.vercel.app' \
  --header 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY'
```

## Step 8: Create API Spotlights (Use Cases)

Add 2-3 detailed use case tutorials:

### Spotlight 1: Building a Price Drop Alert System
Show how to:
1. Search for a product
2. Track its price
3. Set up email alerts
4. Receive notifications

### Spotlight 2: Price Comparison Dashboard
Demonstrate:
1. Comparing prices across platforms
2. Analyzing price history
3. Identifying best deals
4. Visualizing trends

### Spotlight 3: Automated Shopping Assistant
Guide on:
1. Monitoring wish lists
2. Tracking multiple products
3. Webhook integration
4. Automated purchasing triggers

## Step 9: Add Documentation

### FAQ Section
Add these common questions:

**Q: How do I get started?**
A: Subscribe to the BASIC (free) plan, get your API key, and make your first request to the search endpoint.

**Q: What platforms are supported?**
A: Currently eBay (live data) and Amazon (affiliate links). More platforms coming soon.

**Q: How often are prices updated?**
A: Depends on your tier: PRO (15 min), ULTRA (5 min), MEGA (1 min).

**Q: Can I track multiple products?**
A: Yes, track as many products as your quota allows.

**Q: What happens if I exceed my quota?**
A: You'll be charged overage fees based on your tier, or receive 429 errors if on BASIC.

### Links to External Docs
- **Full Documentation**: https://github.com/Lemagicrach/pricedrop-api
- **Terms of Service**: https://github.com/Lemagicrach/pricedrop-api/blob/main/docs/TERMS_OF_SERVICE.md
- **Pricing Details**: https://github.com/Lemagicrach/pricedrop-api/blob/main/docs/PRICING.md
- **GitHub Issues**: https://github.com/Lemagicrach/pricedrop-api/issues

## Step 10: Configure Webhooks (Optional)

If you want to receive notifications from RapidAPI:

1. Go to **"Webhooks"** tab
2. Add webhook URL: `https://pricedrop-api.vercel.app/api/webhooks/rapidapi`
3. Select events:
   - New subscription
   - Subscription cancelled
   - Quota exceeded
   - Payment received

## Step 11: Test Your API

Before publishing:

1. Click **"Test Endpoint"** in RapidAPI dashboard
2. Try each endpoint with sample data
3. Verify responses are correct
4. Check error handling

### Test Checklist
- [ ] Health check endpoint works
- [ ] Product search returns results
- [ ] Authentication is enforced
- [ ] Rate limiting works correctly
- [ ] Error messages are clear
- [ ] All required parameters validated

## Step 12: Publish Your API

### Private Testing First
1. Click **"Publish"** → **"Private"**
2. Test with a few trusted users
3. Gather feedback
4. Fix any issues

### Public Launch
1. Click **"Publish"** → **"Public"**
2. Your API is now live on RapidAPI marketplace!
3. Share the listing URL

## Step 13: Marketing Your API

### On RapidAPI
- Complete your provider profile
- Add a professional logo
- Write a compelling description
- Add screenshots/demos
- Respond to user reviews

### External Marketing
1. **Product Hunt**: Submit your API
2. **Reddit**: Share on r/SideProject, r/webdev
3. **Twitter**: Tweet with hashtags #API #ecommerce #pricetracking
4. **LinkedIn**: Post about your launch
5. **Dev.to**: Write a tutorial article
6. **GitHub**: Add RapidAPI badge to README

### RapidAPI Badge for README
```markdown
[![RapidAPI](https://img.shields.io/badge/RapidAPI-Available-blue)](https://rapidapi.com/your-username/api/pricedrop-api)
```

## Step 14: Monitor and Optimize

### Analytics to Track
- Total subscribers per tier
- API calls per endpoint
- Error rates
- Response times
- User feedback/ratings

### Optimization Tips
1. Monitor which endpoints are most popular
2. Optimize slow endpoints
3. Add features users request
4. Adjust pricing based on usage patterns
5. A/B test pricing tiers

## Troubleshooting

### Import Fails
- Verify YAML syntax: `python -c "import yaml; yaml.safe_load(open('openapi-rapidapi.yaml'))"`
- Check OpenAPI version is 3.0.x
- Ensure all required fields are present

### Authentication Not Working
- Verify RapidAPI headers in your middleware
- Check CORS configuration allows RapidAPI proxy
- Test with RapidAPI's test console

### Rate Limiting Issues
- Implement rate limiting in your API
- Use Redis for distributed rate limiting
- Return proper 429 status codes

### Endpoints Not Responding
- Check Vercel deployment logs
- Verify environment variables are set
- Test endpoints directly (not through RapidAPI)

## Support

If you need help:
- **RapidAPI Support**: support@rapidapi.com
- **Documentation**: https://docs.rapidapi.com/docs/provider-quick-start
- **Community**: https://community.rapidapi.com

## Checklist: Ready to Import

- [ ] API deployed to Vercel and accessible
- [ ] Environment variables configured
- [ ] OpenAPI spec validated
- [ ] All endpoints tested
- [ ] Authentication working
- [ ] Rate limiting implemented
- [ ] Error handling complete
- [ ] Documentation written
- [ ] Pricing tiers planned
- [ ] Code examples ready
- [ ] Use cases documented

## Next Steps After Publishing

1. **Week 1**: Monitor closely, fix any issues
2. **Week 2-4**: Gather user feedback, iterate
3. **Month 2**: Analyze usage, optimize pricing
4. **Month 3+**: Add features, expand platforms

---

**Your OpenAPI file is ready!** Follow this guide to import it to RapidAPI and start generating revenue.

**File to import**: `openapi-rapidapi.yaml`
**Estimated setup time**: 1-2 hours
**Time to first subscriber**: 1-7 days (with marketing)

