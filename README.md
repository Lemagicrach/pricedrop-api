# 🛍️ PriceDropAPI

[![RapidAPI](https://img.shields.io/badge/RapidAPI-Ready-blue)](https://rapidapi.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![Status](https://img.shields.io/badge/status-production-success.svg)](https://github.com/yourusername/pricedrop-api)

**Professional price tracking API for e-commerce platforms.** Monitor product prices, receive alerts on price drops, and analyze pricing trends across major online retailers.

## 🎯 Core Features

- **🔍 Multi-Platform Tracking**: eBay products with real-time data
- **📊 Price History**: Historical pricing data and trend analysis
- **🔔 Price Alerts**: Customizable notifications when prices drop
- **📈 Market Insights**: AI-powered demand analysis and buying recommendations
- **⚡ Fast & Reliable**: Serverless architecture with 99.9% uptime
- **🔒 Secure**: Enterprise-grade security with RapidAPI authentication

## 🏪 Currently Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| ✅ **eBay** | **Fully Operational** | Real-time prices, seller ratings, demand analysis |
| 🔄 **Amazon** | Affiliate Links Only | Requires PA-API approval for live prices |
| ⏳ Walmart | Coming Soon | Pending API integration |
| ⏳ BestBuy | Coming Soon | Pending API integration |
| ⏳ Target | Coming Soon | Pending API integration |

## 🚀 Quick Start (RapidAPI)

### 1. Subscribe on RapidAPI
Visit the [PriceDropAPI on RapidAPI](https://rapidapi.com/your-api) and subscribe to a plan.

### 2. Make Your First Request

```javascript
const axios = require('axios');

const options = {
  method: 'POST',
  url: 'https://pricedrop-api.p.rapidapi.com/api/v1/products/track',
  headers: {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
    'X-RapidAPI-Host': 'pricedrop-api.p.rapidapi.com'
  },
  data: {
    url: 'https://www.ebay.com/itm/123456789',
    target_price: 299.99,
    notify_on_drop: true,
    user_email: 'your@email.com'
  }
};

try {
  const response = await axios.request(options);
  console.log(response.data);
} catch (error) {
  console.error(error);
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product tracking initialized successfully",
  "tracking": {
    "tracking_id": "ebay-123456789",
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://www.ebay.com/itm/123456789",
    "platform": "ebay",
    "status": "active"
  },
  "product": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apple iPhone 15 Pro Max 256GB",
    "current_price": 1099.99,
    "currency": "USD",
    "in_stock": true
  },
  "alerts": {
    "enabled": true,
    "target_price": 299.99,
    "email": "your@email.com",
    "check_frequency": "Every 1 hour(s)"
  }
}
```

## 📚 API Endpoints

### **Products**

#### Search Products
```http
GET /api/v1/products/search?keywords={query}&limit={number}
```

**Parameters:**
- `keywords` (required): Search query
- `limit` (optional): Results to return (1-100, default: 20)
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `sortBy` (optional): Sort order (relevance, price, newest)

**Example:**
```bash
curl -X GET \
  'https://pricedrop-api.p.rapidapi.com/api/v1/products/search?keywords=laptop&limit=5' \
  -H 'X-RapidAPI-Key: YOUR_KEY' \
  -H 'X-RapidAPI-Host: pricedrop-api.p.rapidapi.com'
```

---

#### Get Product Details
```http
GET /api/v1/products/{id}
```

**Returns:** Complete product information with market insights

**Example Response:**
```json
{
  "success": true,
  "product": {
    "id": "123456789",
    "title": "Gaming Laptop 16GB RAM",
    "price": {
      "current": 899.99,
      "currency": "USD"
    },
    "insights": {
      "demand_level": {
        "level": "high",
        "score": 85,
        "metrics": {
          "watchers": 142,
          "sold": 38
        }
      },
      "seller_reliability": {
        "rating": "excellent",
        "feedbackScore": 2847,
        "positivePercent": "99.2%"
      },
      "best_time_to_buy": {
        "recommendation": "Buy now - high demand depleting stock"
      }
    }
  }
}
```

---

#### Track Product
```http
POST /api/v1/products/track
```

**Request Body:**
```json
{
  "url": "https://www.ebay.com/itm/123456789",
  "target_price": 299.99,
  "notify_on_drop": true,
  "check_frequency": 2,
  "user_email": "alert@example.com"
}
```

**Parameters:**
- `url` (required): Product URL to track
- `target_price` (optional): Alert threshold price
- `notify_on_drop` (optional): Enable email notifications
- `check_frequency` (optional): Hours between checks (default: 1)
- `user_email` (optional): Email for notifications

---

#### Compare Prices
```http
POST /api/v1/products/compare
```

**Request Body:**
```json
{
  "product": "iPhone 15 Pro",
  "limit": 10
}
```

**Returns:** Price comparison across available platforms

---

### **Price History**

#### Get Price History
```http
GET /api/v1/prices/history?product_id={id}&days={number}&interval={type}
```

**Parameters:**
- `product_id` (required): Product or tracking ID
- `days` (optional): Historical period (default: 30)
- `interval` (optional): Data granularity (daily, hourly, weekly)

**Example Response:**
```json
{
  "success": true,
  "statistics": {
    "current_price": 249.99,
    "lowest_price": 199.99,
    "highest_price": 349.99,
    "average_price": "275.50",
    "trend": "decreasing"
  },
  "history": [
    {
      "price": 249.99,
      "timestamp": "2025-01-15T12:00:00Z",
      "available": true
    }
  ],
  "recommendations": {
    "buy_now": true,
    "wait": false,
    "target_price": "219.99"
  }
}
```

---

### **Alerts**

#### Create Price Alert
```http
POST /api/v1/prices/alerts
```

**Request Body:**
```json
{
  "product_url": "https://www.ebay.com/itm/123456789",
  "target_price": 199.99,
  "alert_type": "price_drop",
  "notification_channels": ["email", "api"],
  "email": "alerts@example.com"
}
```

---

#### List Alerts
```http
GET /api/v1/prices/alerts?status={status}&triggered={boolean}
```

**Parameters:**
- `status` (optional): Filter by status (all, active, paused, cancelled)
- `triggered` (optional): Filter by trigger state (true/false)

---

#### Update Alert
```http
PUT /api/v1/prices/alerts?alert_id={id}
```

---

#### Delete Alert
```http
DELETE /api/v1/prices/alerts?alert_id={id}
```

---

### **System**

#### Health Check
```http
GET /api/v1/core/health
```

**No authentication required** - Use for testing and monitoring

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "version": "1.0.0",
  "service": "PriceDrop API",
  "checks": {
    "api": "operational",
    "database": "operational",
    "ebay_api": "operational"
  },
  "uptime": {
    "seconds": 45296.78,
    "formatted": "0d 12h 34m"
  }
}
```

---

#### Service Status
```http
GET /api/v1/core/status
```

**Returns:** Detailed service metrics and performance data

---

#### Supported Stores
```http
GET /api/stores
```

**Returns:** List of all supported e-commerce platforms

---

## 💰 Pricing Plans

Rate limits and pricing are managed by RapidAPI. Visit the [API listing](https://rapidapi.com/your-api) for current plans.

**Typical Structure:**
- **Free Tier**: 100 requests/month
- **Basic**: 1,000 requests/month  
- **Pro**: 10,000 requests/month
- **Ultra**: 50,000 requests/month
- **Enterprise**: Custom limits

## 📊 Response Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Resource Created |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Invalid API key |
| `404` | Not Found |
| `429` | Rate Limit Exceeded |
| `500` | Internal Server Error |
| `502` | Bad Gateway - Upstream service error |

## 🔧 Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
- `MISSING_URL`: Product URL not provided
- `UNSUPPORTED_STORE`: Platform not supported
- `INVALID_API_KEY`: Authentication failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `EBAY_API_ERROR`: eBay service unavailable

## 💡 Use Cases

### 1. E-commerce Price Monitoring
```javascript
// Track competitor prices
const response = await trackProduct({
  url: 'https://www.ebay.com/itm/competitor-product',
  check_frequency: 1 // Check hourly
});
```

### 2. Personal Shopping Assistant
```javascript
// Get notified when price drops
const alert = await createAlert({
  product_url: 'https://www.ebay.com/itm/desired-item',
  target_price: 299.99,
  notification_channels: ['email']
});
```

### 3. Market Research
```javascript
// Analyze pricing trends
const history = await getPriceHistory({
  product_id: 'ebay-123456789',
  days: 90
});

console.log(history.statistics.trend); // "decreasing"
console.log(history.recommendations.buy_now); // true
```

## 🛠️ Self-Hosting (Optional)

Want to run your own instance? Here's how:

### Prerequisites
- Node.js 18+
- Vercel account (optional for deployment)
- eBay Developer account (required)
- Supabase account (optional for persistence)

### Environment Setup

```bash
# Clone repository
git clone https://github.com/yourusername/pricedrop-api.git
cd pricedrop-api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Required Environment Variables

```env
# eBay Integration (REQUIRED)
EBAY_APP_ID=your_ebay_production_app_id
EBAY_ENVIRONMENT=production

# Database (Optional - enables persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Notifications (Optional)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com

# Security (Recommended)
RAPIDAPI_PROXY_SECRET=your_random_secret_here
CRON_SECRET=your_cron_secret_here
```

### Getting eBay App ID

1. Visit [eBay Developers Program](https://developer.ebay.com/)
2. Create an account
3. Create a new application
4. Select "Production" environment
5. Copy your **App ID (Client ID)**
6. Add to `.env.local` as `EBAY_APP_ID`

### Database Setup (Optional)

If you want persistent tracking:

1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Run the migration script from `MIGRATION_SQL.sql`
5. Copy URL and Keys to `.env.local`

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Configure Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `.env.local`
5. Redeploy

## 🔐 Security

- **HTTPS Only**: All requests must use HTTPS
- **API Key Auth**: Managed by RapidAPI
- **Rate Limiting**: Automatic per-plan limits
- **Data Encryption**: All data encrypted in transit and at rest
- **GDPR Compliant**: Full data protection compliance

## 📖 Code Examples

### Python

```python
import requests

url = "https://pricedrop-api.p.rapidapi.com/api/v1/products/track"
payload = {
    "url": "https://www.ebay.com/itm/123456789",
    "target_price": 299.99
}
headers = {
    "content-type": "application/json",
    "X-RapidAPI-Key": "YOUR_API_KEY",
    "X-RapidAPI-Host": "pricedrop-api.p.rapidapi.com"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

### PHP

```php
<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://pricedrop-api.p.rapidapi.com/api/v1/products/track",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    "url" => "https://www.ebay.com/itm/123456789",
    "target_price" => 299.99
  ]),
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "X-RapidAPI-Key: YOUR_API_KEY",
    "X-RapidAPI-Host: pricedrop-api.p.rapidapi.com"
  ],
]);

$response = curl_exec($curl);
curl_close($curl);

echo $response;
```

### cURL

```bash
curl -X POST \
  https://pricedrop-api.p.rapidapi.com/api/v1/products/track \
  -H 'Content-Type: application/json' \
  -H 'X-RapidAPI-Key: YOUR_API_KEY' \
  -H 'X-RapidAPI-Host: pricedrop-api.p.rapidapi.com' \
  -d '{
    "url": "https://www.ebay.com/itm/123456789",
    "target_price": 299.99,
    "notify_on_drop": true
  }'
```

## 🤝 Support

- **Documentation**: [Full API Docs](https://pricedrop-api.vercel.app/docs)
- **RapidAPI**: [Support Portal](https://rapidapi.com/support)
- **GitHub Issues**: [Report Bug](https://github.com/yourusername/pricedrop-api/issues)
- **Email**: support@pricedropapi.com

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ eBay integration with real-time pricing
- ✅ Price history and trend analysis
- ✅ Customizable price alerts
- ✅ AI-powered market insights
- ✅ RESTful API design
- ✅ RapidAPI marketplace integration

### Coming Soon
- 🔜 Amazon live pricing (pending PA-API approval)
- 🔜 Walmart integration
- 🔜 BestBuy support
- 🔜 Webhook notifications
- 🔜 GraphQL endpoint
- 🔜 Mobile SDKs

## ⚖️ Terms of Service

- **Fair Use**: No abuse or scraping of our API
- **Attribution**: Commercial use must credit PriceDropAPI
- **Data Usage**: Tracked data is yours, we don't sell it
- **Uptime**: 99.9% SLA on paid plans
- **Support**: Email support on all plans

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vercel](https://vercel.com) serverless functions
- Powered by [eBay Finding API](https://developer.ebay.com)
- Data storage by [Supabase](https://supabase.com)
- Distributed via [RapidAPI](https://rapidapi.com)

---

**Made with ❤️ by the PriceDropAPI Team**

*Last Updated: January 2025*