# PriceDrop API Pricing

## Subscription Plans

PriceDrop API offers four subscription tiers designed to meet different usage needs, from individual developers testing the API to enterprises requiring high-volume access.

### BASIC (Free)
**Perfect for testing and small projects**

- **Price:** $0/month
- **Requests:** 100 requests/month
- **Rate Limit:** 10 requests/minute
- **Features:**
  - Product search (eBay only)
  - Basic product details
  - Price information
  - Public health check endpoint
- **Support:** Community support via GitHub Issues
- **Best For:** Developers evaluating the API, hobby projects, learning

### PRO ($25/month)
**Ideal for small businesses and active developers**

- **Price:** $25/month
- **Requests:** 1,000 requests/month
- **Rate Limit:** 30 requests/minute
- **Features:**
  - All BASIC features
  - Product tracking
  - Email price alerts
  - Price history (30 days)
  - Product comparison
  - Check frequency: 15 minutes
  - All supported platforms (eBay, Amazon affiliate links)
- **Overage:** $0.03 per request over quota
- **Support:** Email support (48-hour response time)
- **Best For:** Small e-commerce businesses, price comparison tools, personal shopping assistants

### ULTRA ($75/month)
**Designed for growing businesses with higher demands**

- **Price:** $75/month
- **Requests:** 10,000 requests/month
- **Rate Limit:** 100 requests/minute
- **Features:**
  - All PRO features
  - Webhook notifications
  - Price history (90 days)
  - Priority alert processing
  - Check frequency: 5 minutes
  - Advanced demand insights
  - Seller reliability scoring
  - Custom alert rules
- **Overage:** $0.008 per request over quota
- **Support:** Priority email support (24-hour response time)
- **Best For:** Medium-sized e-commerce platforms, market research tools, automated trading bots

### MEGA ($150/month)
**Enterprise-grade solution for high-volume applications**

- **Price:** $150/month
- **Requests:** 50,000 requests/month
- **Rate Limit:** 500 requests/minute
- **Features:**
  - All ULTRA features
  - Price history (unlimited)
  - Check frequency: Custom (down to 1 minute)
  - Dedicated support channel
  - SLA guarantee (99.9% uptime)
  - Custom webhook configurations
  - Bulk operations support
  - API usage analytics dashboard
  - Early access to new features
- **Overage:** $0.003 per request over quota
- **Support:** Dedicated support (4-hour response time)
- **Best For:** Large e-commerce platforms, enterprise applications, high-frequency trading systems

## Feature Comparison

| Feature | BASIC | PRO | ULTRA | MEGA |
|---------|-------|-----|-------|------|
| **Monthly Requests** | 100 | 1,000 | 10,000 | 50,000 |
| **Rate Limit** | 10/min | 30/min | 100/min | 500/min |
| **Product Search** | ✓ | ✓ | ✓ | ✓ |
| **Product Details** | ✓ | ✓ | ✓ | ✓ |
| **Price Tracking** | ✗ | ✓ | ✓ | ✓ |
| **Email Alerts** | ✗ | ✓ | ✓ | ✓ |
| **Webhook Alerts** | ✗ | ✗ | ✓ | ✓ |
| **Price History** | ✗ | 30 days | 90 days | Unlimited |
| **Check Frequency** | - | 15 min | 5 min | 1 min |
| **Product Comparison** | ✗ | ✓ | ✓ | ✓ |
| **Demand Insights** | ✗ | Basic | Advanced | Advanced |
| **Seller Scoring** | ✗ | ✗ | ✓ | ✓ |
| **Custom Alert Rules** | ✗ | ✗ | ✓ | ✓ |
| **Bulk Operations** | ✗ | ✗ | ✗ | ✓ |
| **Analytics Dashboard** | ✗ | ✗ | ✗ | ✓ |
| **SLA Guarantee** | ✗ | ✗ | ✗ | 99.9% |
| **Support** | Community | Email (48h) | Priority (24h) | Dedicated (4h) |

## Overage Pricing

If you exceed your monthly quota, you will be charged for additional requests at the following rates:

- **BASIC:** Hard limit (no overages, returns 429 error)
- **PRO:** $0.03 per request
- **ULTRA:** $0.008 per request
- **MEGA:** $0.003 per request

**Important:** You will receive email notifications when you reach 85% and 100% of your quota. To prevent unexpected charges, you can set a hard limit in your RapidAPI dashboard.

## Quota Reset

All quotas reset on the first day of each calendar month at 00:00 UTC. Unused requests do not roll over to the next month.

## Payment Methods

- Credit Card (Visa, Mastercard, American Express)
- Debit Card
- PayPal (via RapidAPI)

All payments are processed securely through RapidAPI's payment gateway.

## Refund Policy

- **Free Trial:** BASIC plan is free, no refund needed
- **Paid Plans:** Refunds are available within 7 days of subscription if you've used less than 10% of your monthly quota
- **Overage Charges:** Overage fees are non-refundable, but we can work with you on accidental overages (contact support)

## Enterprise Plans

Need more than 50,000 requests per month? We offer custom enterprise plans with:

- Custom request quotas
- Dedicated infrastructure
- White-label options
- Custom SLAs
- On-premise deployment options
- Dedicated account manager

Contact us at [enterprise@pricedrop-api.com](mailto:enterprise@pricedrop-api.com) to discuss your requirements.

## Frequently Asked Questions

### Can I upgrade or downgrade my plan?

Yes, you can change your plan at any time. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle.

### What happens if I exceed my rate limit?

You will receive a `429 Too Many Requests` error. Your requests will be throttled until the rate limit window resets. Consider upgrading to a higher tier if you consistently hit rate limits.

### Do you offer discounts for annual subscriptions?

Yes! Annual subscriptions receive a 20% discount. Contact us for details.

### Can I get a refund if I'm not satisfied?

Yes, within 7 days of subscription and if you've used less than 10% of your quota.

### What payment methods do you accept?

We accept all major credit cards, debit cards, and PayPal through RapidAPI's secure payment gateway.

### How do I monitor my usage?

You can monitor your usage in real-time through the RapidAPI Developer Dashboard or by checking the response headers on each API call.

### What happens if I don't pay my bill?

Your API access will be suspended until payment is received. After 30 days, your account may be terminated and your tracked products will be deleted.

## Getting Started

1. **Sign up** on [RapidAPI](https://rapidapi.com)
2. **Subscribe** to PriceDrop API (start with BASIC for free)
3. **Get your API key** from the RapidAPI dashboard
4. **Make your first request** using our [Quick Start Guide](../README.md#-quick-start-rapidapi)
5. **Monitor your usage** in the Developer Dashboard
6. **Upgrade** when you need more capacity

## Support

- **Documentation:** [https://pricedrop-api.vercel.app/docs](https://pricedrop-api.vercel.app/docs)
- **Community:** [GitHub Issues](https://github.com/Lemagicrach/pricedrop-api/issues)
- **Email:** support@pricedrop-api.com
- **Enterprise:** enterprise@pricedrop-api.com

---

*Prices and features subject to change. Last updated: January 2025*

