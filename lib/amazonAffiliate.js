// lib/amazonAffiliate.js - Simplified Amazon Affiliate API
// Last updated: 2025-01-15
// Note: Real-time pricing requires PA-API approval

class AmazonAffiliateAPI {
  constructor() {
    this.partnerTag = process.env.AMAZON_PARTNER_TAG || 'your-tag-20';
    
    // Amazon domains by region
    this.amazonDomains = {
      'US': 'amazon.com',
      'UK': 'amazon.co.uk',
      'DE': 'amazon.de',
      'FR': 'amazon.fr',
      'JP': 'amazon.co.jp',
      'CA': 'amazon.ca',
      'IT': 'amazon.it',
      'ES': 'amazon.es',
      'IN': 'amazon.in',
      'BR': 'amazon.com.br',
      'MX': 'amazon.com.mx',
      'AU': 'amazon.com.au'
    };

    // Warn if partner tag not configured
    if (this.partnerTag === 'your-tag-20') {
      console.warn('⚠️  Amazon Partner Tag not configured');
      console.warn('   Set AMAZON_PARTNER_TAG in your .env file');
      console.warn('   Join Amazon Associates: https://affiliate-program.amazon.com');
    }
  }

  /**
   * Extract ASIN from various Amazon URL formats
   * @param {string} url - Amazon product URL
   * @returns {string|null} ASIN or null
   */
  extractASIN(url) {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/i,
      /\/o\/ASIN\/([A-Z0-9]{10})/i,
      /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
      /amazon\.[a-z.]+\/([A-Z0-9]{10})(?:\/|$|\?)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }
    
    return null;
  }

  /**
   * Detect Amazon region from URL
   * @param {string} url - Amazon URL
   * @returns {string} Region code (e.g., 'US', 'UK')
   */
  detectRegion(url) {
    for (const [region, domain] of Object.entries(this.amazonDomains)) {
      if (url.includes(domain)) {
        return region;
      }
    }
    return 'US'; // Default to US
  }

  /**
   * Create affiliate link (WORKS WITHOUT PA-API APPROVAL)
   * @param {string} url - Amazon product URL
   * @param {Object} options - Options (region, tag)
   * @returns {Object} Affiliate link data
   */
  createAffiliateLink(url, options = {}) {
    const asin = this.extractASIN(url);
    
    if (!asin) {
      return {
        success: false,
        error: 'Invalid Amazon URL - Could not extract ASIN',
        code: 'INVALID_URL'
      };
    }
    
    const region = options.region || this.detectRegion(url);
    const domain = this.amazonDomains[region] || this.amazonDomains.US;
    const tag = options.tag || this.partnerTag;
    
    return {
      success: true,
      asin,
      region,
      originalUrl: url,
      affiliateUrl: `https://www.${domain}/dp/${asin}?tag=${tag}`,
      shortLink: `https://amzn.to/${asin}?tag=${tag}`,
      textLink: `https://www.${domain}/gp/product/${asin}?tag=${tag}`
    };
  }

  /**
   * Generate search link with affiliate tag
   * @param {string} keywords - Search keywords
   * @param {string} region - Region code
   * @param {string} tag - Affiliate tag
   * @returns {string} Search URL with affiliate tag
   */
  generateSearchLink(keywords, region = 'US', tag = null) {
    const domain = this.amazonDomains[region] || this.amazonDomains.US;
    const affiliateTag = tag || this.partnerTag;
    
    const params = new URLSearchParams({
      k: keywords,
      tag: affiliateTag,
      linkCode: 'ur2'
    });
    
    return `https://www.${domain}/s?${params.toString()}`;
  }

  /**
   * Generate category link
   * @param {string} category - Category name
   * @param {string} domain - Amazon domain
   * @param {string} tag - Affiliate tag
   * @returns {string} Category URL with affiliate tag
   */
  generateCategoryLink(category, domain = 'amazon.com', tag = null) {
    const affiliateTag = tag || this.partnerTag;
    
    const categories = {
      'electronics': 'electronics',
      'books': 'stripbooks',
      'clothing': 'fashion',
      'home': 'garden',
      'toys': 'toys-and-games',
      'sports': 'sporting',
      'beauty': 'beauty',
      'automotive': 'automotive'
    };
    
    const node = categories[category.toLowerCase()] || category;
    return `https://www.${domain}/b?node=${node}&tag=${affiliateTag}`;
  }

  /**
   * Get product info (realistic about PA-API requirement)
   * @param {string} url - Amazon product URL
   * @returns {Object} Product info with affiliate links
   */
  async getProductInfo(url) {
    const asin = this.extractASIN(url);
    
    if (!asin) {
      return {
        success: false,
        error: 'Invalid Amazon URL',
        code: 'INVALID_URL'
      };
    }
    
    const affiliateLink = this.createAffiliateLink(url);
    
    return {
      success: true,
      note: 'Real-time pricing requires Amazon PA-API approval',
      asin,
      url,
      affiliateLink: affiliateLink.success ? affiliateLink.affiliateUrl : null,
      
      message: 'To get live product data, you need:',
      requirements: [
        '1. Join Amazon Associates Program (https://affiliate-program.amazon.com)',
        '2. Generate 3 qualifying sales within 180 days',
        '3. Apply for PA-API v5 access',
        '4. Use AWS credentials for API authentication'
      ],
      
      alternatives: {
        keepa: {
          name: 'Keepa API',
          url: 'https://keepa.com/#!api',
          note: 'Best for price history tracking'
        },
        rainforest: {
          name: 'Rainforest API',
          url: 'https://www.rainforestapi.com/',
          note: 'Real-time Amazon data without PA-API'
        },
        scraper: {
          name: 'ScraperAPI',
          url: 'https://www.scraperapi.com/',
          note: 'Use with residential proxies for scraping'
        }
      }
    };
  }

  /**
   * Validate affiliate tag format
   * @param {string} tag - Affiliate tag
   * @returns {boolean} Valid or not
   */
  validateTag(tag) {
    // Amazon affiliate tags: xxxxx-20 (US), xxxxx-21 (UK), etc.
    const tagPattern = /^[a-zA-Z0-9]+-\d{2}$/;
    return tagPattern.test(tag);
  }

  /**
   * Get commission rates by category (informational)
   * @returns {Object} Commission rates
   */
  getCommissionRates() {
    return {
      'Luxury Beauty': '10%',
      'Amazon Games': '20%',
      'Digital Music': '5%',
      'Physical Music & Handmade': '3%',
      'Books': '4.5%',
      'Kitchen': '4.5%',
      'Automotive': '4.5%',
      'Electronics': '4%',
      'Computers': '2.5%',
      'Video Games & Consoles': '1%',
      'Toys': '3%',
      'Other': '4%',
      note: 'Rates updated quarterly. Check Amazon Associates dashboard for current rates.'
    };
  }

  /**
   * Generate bulk affiliate links
   * @param {Array} urls - Array of Amazon URLs
   * @returns {Array} Array of affiliate link objects
   */
  generateBulkLinks(urls) {
    return urls.map(url => {
      try {
        const result = this.createAffiliateLink(url);
        return {
          original: url,
          ...result
        };
      } catch (error) {
        return {
          original: url,
          success: false,
          error: error.message
        };
      }
    });
  }
}

module.exports = AmazonAffiliateAPI;