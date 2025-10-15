# Changelog

All notable changes to the PriceDrop API project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-15

### Fixed
- **CRITICAL:** Fixed OpenAPI specification YAML syntax errors that prevented RapidAPI import
  - Corrected indentation for all path definitions
  - Fixed schema reference indentation in `/api/v1/prices/check` endpoint
  - Added missing `openapi: 3.0.3` version declaration at file start
- Fixed incorrect middleware import paths in `api/v1/products/track.js`
- Fixed incorrect service import paths in `api/v1/products/track.js`
- Updated placeholder URLs from "yourusername" to actual GitHub username "Lemagicrach"
  - Fixed in `package.json` (repository and bugs URLs)
  - Fixed in `README.md` (status badge and clone command)
- Sanitized `.env.example` to remove actual Supabase URL credentials

### Added
- Comprehensive pricing documentation (`docs/PRICING.md`)
  - Detailed breakdown of all 4 subscription tiers (BASIC, PRO, ULTRA, MEGA)
  - Feature comparison table
  - Overage pricing explanation
  - FAQ section
  - Enterprise plan information
- Terms of Service document (`docs/TERMS_OF_SERVICE.md`)
  - Acceptable use policy
  - Payment and billing terms
  - SLA definitions
  - Liability limitations
  - Data protection compliance
- Enhanced pricing section for README (`docs/README_PRICING_SECTION.md`)
- This CHANGELOG file to track all project changes

### Changed
- Improved OpenAPI specification compliance for RapidAPI marketplace
- Enhanced security by removing exposed credentials from example files

### Documentation
- Added comprehensive pricing tiers aligned with RapidAPI best practices
- Created legal framework for commercial API operation
- Improved repository professionalism with proper URLs and documentation

## [1.0.0] - 2025-01-15

### Initial Release
- eBay integration with real-time pricing via eBay Finding API
- Product search with filters (price range, sort order, condition)
- Product tracking with customizable check frequencies
- Price history analytics and trend detection
- Email and webhook notification system
- AI-powered demand analysis and buying recommendations
- Seller reliability scoring
- RESTful API design with comprehensive endpoints
- OpenAPI 3.0 specification
- Supabase database integration for persistence
- SendGrid email notifications
- Vercel serverless deployment configuration
- RapidAPI authentication middleware
- CORS support for web applications
- Rate limiting implementation
- Health check and status endpoints
- Comprehensive documentation and code examples

### Supported Platforms
- eBay (fully operational with real-time data)
- Amazon (affiliate links only, pending PA-API approval)

### API Endpoints
- `GET /api` - API overview
- `GET /api/stores` - List supported stores
- `GET /api/v1/core/health` - Health check
- `GET /api/v1/core/status` - Detailed status
- `GET /api/v1/products/search` - Search products
- `GET /api/v1/products/{id}` - Get product details
- `POST /api/v1/products/track` - Track product prices
- `POST /api/v1/products/compare` - Compare prices
- `GET /api/v1/prices/history` - Get price history
- `GET /api/v1/prices/alerts` - List alerts
- `POST /api/v1/prices/alerts` - Create alert
- `PUT /api/v1/prices/alerts` - Update alert
- `DELETE /api/v1/prices/alerts` - Delete alert
- `POST /api/v1/prices/check` - Trigger price check (cron)
- `POST /api/v1/affiliate/generate` - Generate affiliate links

### Infrastructure
- Node.js 18+ runtime
- Vercel serverless functions
- Supabase PostgreSQL database
- SendGrid email service
- GitHub Actions for CI/CD
- Vercel Cron for scheduled tasks

## [Unreleased]

### Planned Features
- Amazon live pricing (pending PA-API approval)
- Walmart integration
- BestBuy support
- Target integration
- GraphQL endpoint
- Webhook notification enhancements
- Mobile SDKs (iOS, Android)
- Price prediction using machine learning
- Multi-currency support
- Bulk import/export functionality
- Advanced analytics dashboard
- Custom scraping rules
- API usage analytics for consumers

### Planned Improvements
- Redis caching layer for performance
- Database connection pooling
- Job queue implementation (Bull/BullMQ)
- Enhanced error handling and logging
- Comprehensive test suite
- Performance monitoring and alerting
- API versioning strategy
- Internationalization (i18n)
- Advanced rate limiting with Redis
- Request queuing for high traffic

---

## Version History

- **1.0.1** (2025-01-15) - Critical fixes for RapidAPI listing + documentation
- **1.0.0** (2025-01-15) - Initial release with eBay integration

## Support

For questions about changes or to report issues:
- **GitHub Issues:** https://github.com/Lemagicrach/pricedrop-api/issues
- **Email:** support@pricedrop-api.com
- **Documentation:** https://pricedrop-api.vercel.app/docs

