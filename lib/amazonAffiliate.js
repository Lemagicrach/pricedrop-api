// lib/amazon-enhanced.js
const crypto = require('crypto');
const axios = require('axios');

class AmazonAffiliateAPI {
  constructor() {
    this.partnerTag = process.env.AMAZON_PARTNER_TAG || 'default-tag-20';
    this.accessKey = process.env.AMAZON_ACCESS_KEY;
    this.secretKey = process.env.AMAZON_SECRET_KEY;
    this.region = process.env.AMAZON_REGION || 'us-east-1';
    this.host = 'webservices.amazon.com';
    
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
  }

  // Extract ASIN from various Amazon URL formats
  extractASIN(url) {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/i,
      /\/o\/ASIN\/([A-Z0-9]{10})/i,
      /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
      /amazon\.[a-z.]+\/([A-Z0-9]{10})(?:\/|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }
    
    // Try to extract from shortened URLs
    if (url.includes('amzn.to') || url.includes('amzn.com')) {
      // These would need to be resolved first
      return this.resolveShortURL(url);
    }
    
    return null;
  }

  // Resolve shortened Amazon URLs
  async resolveShortURL(shortUrl) {
    try {
      const response = await axios.head(shortUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      const finalUrl = response.request.res.responseUrl || response.request.path;
      return this.extractASIN(finalUrl);
    } catch (error) {
      console.error('Error resolving short URL:', error.message);
      return null;
    }
  }

  // Detect Amazon region from URL
  detectRegion(url) {
    for (const [region, domain] of Object.entries(this.amazonDomains)) {
      if (url.includes(domain)) {
        return region;
      }
    }
    return 'US'; // Default to US
  }

  // Generate affiliate link with proper tracking
  createAffiliateLink(url, options = {}) {
    const asin = this.extractASIN(url);
    if (!asin) {
      return {
        success: false,
        error: 'Invalid Amazon URL - Could not extract ASIN'
      };
    }
    
    const region = options.region || this.detectRegion(url);
    const domain = this.amazonDomains[region];
    const tag = options.tag || this.partnerTag;
    
    // Build affiliate URL with various tracking parameters
    const affiliateUrl = `https://www.${domain}/dp/${asin}?tag=${tag}`;
    
    // Add additional tracking parameters if needed
    const params = new URLSearchParams();
    params.append('linkCode', 'll1'); // Link type
    params.append('language', options.language || 'en_US');
    
    if (options.campaign) {
      params.append('camp', options.campaign);
    }
    
    if (options.creative) {
      params.append('creative', options.creative);
    }
    
    return {
      success: true,
      asin: asin,
      region: region,
      originalUrl: url,
      affiliateUrl: `${affiliateUrl}&${params.toString()}`,
      shortLink: this.generateShortLink(asin, tag),
      textLink: `https://www.${domain}/gp/product/${asin}?tag=${tag}`,
      searchLink: this.generateSearchLink(options.keywords || asin, domain, tag)
    };
  }

  // Generate short affiliate link
  generateShortLink(asin, tag) {
    return `https://amzn.to/${asin}?tag=${tag}`;
  }

  // Generate search affiliate link
  generateSearchLink(keywords, domain = 'amazon.com', tag = null) {
    const affiliateTag = tag || this.partnerTag;
    const searchUrl = `https://www.${domain}/s`;
    const params = new URLSearchParams({
      k: keywords,
      tag: affiliateTag,
      linkCode: 'ur2'
    });
    
    return `${searchUrl}?${params.toString()}`;
  }

  // Generate category browse link
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
      'automotive': 'automotive',
      'grocery': 'grocery',
      'music': 'music'
    };
    
    const node = categories[category.toLowerCase()] || category;
    return `https://www.${domain}/b?node=${node}&tag=${affiliateTag}`;
  }

  // Parse Amazon product page (basic scraping fallback)
  async getProductInfo(url) {
    const asin = this.extractASIN(url);
    
    if (!asin) {
      return {
        success: false,
        error: 'Invalid Amazon URL'
      };
    }
    
    // Since PA-API requires approval, return structured data
    // In production, this would make actual API calls
    return {
      success: true,
      note: 'Full product data requires Amazon PA-API approval',
      data: {
        asin: asin,
        url: url,
        affiliateLinks: this.createAffiliateLink(url),
        message: 'To get real-time pricing, you need:',
        requirements: [
          '1. Join Amazon Associates Program',
          '2. Generate 3 qualifying sales in 180 days',
          '3. Apply for PA-API v5 access',
          '4. Use AWS credentials for API calls'
        ],
        alternatives: [
          'Use Keepa API for price history',
          'Use Rainforest API for product data',
          'Use ScraperAPI with residential proxies'
        ]
      }
    };
  }

  // Create comparison widget
  generateComparisonWidget(asins, options = {}) {
    const domain = this.amazonDomains[options.region || 'US'];
    const tag = options.tag || this.partnerTag;
    
    const widget = {
      type: 'comparison',
      asins: asins,
      links: asins.map(asin => ({
        asin: asin,
        link: `https://www.${domain}/dp/${asin}?tag=${tag}`,
        image: `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL250_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1&tag=${tag}`
      })),
      iframe: this.generateIframeCode(asins, domain, tag)
    };
    
    return widget;
  }

  // Generate iframe widget code
  generateIframeCode(asins, domain, tag) {
    const baseUrl = `https://ws-na.amazon-adsystem.com/widgets/cm`;
    const params = new URLSearchParams({
      ref: 'as_li_qf_sp_asin_il',
      t: tag,
      tracking_id: tag,
      marketplace: domain,
      asins: asins.join(','),
      linkId: crypto.randomBytes(16).toString('hex'),
      show_border: false,
      link_opens_in_new_window: true
    });
    
    return `<iframe src="${baseUrl}?${params.toString()}" width="300" height="250" scrolling="no" border="0" marginwidth="0" style="border:none;" frameborder="0"></iframe>`;
  }

  // Generate OneLink for international users
  generateOneLink(asin, options = {}) {
    // Amazon OneLink automatically redirects users to their local Amazon store
    const onelinkId = options.onelinkId || 'default';
    const tag = options.tag || this.partnerTag;
    
    return {
      universalLink: `https://www.amazon.com/dp/${asin}?tag=${tag}`,
      onelinkScript: `<div id="amzn-assoc-ad-${asin}"></div>
        <script async src="//z-na.amazon-adsystem.com/widgets/onejs?MarketPlace=US&adInstanceId=${asin}&storeId=${tag}"></script>`,
      note: 'OneLink requires setup in Amazon Associates dashboard'
    };
  }

  // Validate affiliate tag
  validateTag(tag) {
    // Amazon affiliate tags follow pattern: xxxxx-20 (for US)
    const tagPattern = /^[a-zA-Z0-9]+-\d{2}$/;
    return tagPattern.test(tag);
  }

  // Get commission rates by category
  getCommissionRates() {
    return {
      'Luxury Beauty': '10%',
      'Amazon Games': '20%',
      'Digital Music': '5%',
      'Physical Music': '3%',
      'Books': '4.5%',
      'Electronics': '4%',
      'Computers': '2.5%',
      'Toys': '3%',
      'Video Games': '1%',
      'Other': '4%',
      note: 'Rates subject to change. Check Amazon Associates dashboard for current rates.'
    };
  }

  // Generate bulk affiliate links
  generateBulkLinks(urls) {
    return urls.map(url => {
      try {
        return {
          original: url,
          ...this.createAffiliateLink(url)
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

  // Generate Native Shopping Ads code
  generateNativeAd(options = {}) {
    const tag = options.tag || this.partnerTag;
    const adType = options.type || 'recommendation'; // recommendation, search, custom
    
    return {
      script: `<script type="text/javascript">
amzn_assoc_tracking_id = "${tag}";
amzn_assoc_ad_mode = "manual";
amzn_assoc_ad_type = "smart";
amzn_assoc_marketplace = "amazon";
amzn_assoc_region = "US";
amzn_assoc_design = "enhanced_links";
amzn_assoc_asins = "${options.asins || ''}";
amzn_assoc_placement = "adunit";
amzn_assoc_linkid = "${crypto.randomBytes(16).toString('hex')}";
</script>
<script src="//z-na.amazon-adsystem.com/widgets/onejs?MarketPlace=US"></script>`,
      documentation: 'https://affiliate-program.amazon.com/help/topic/t400'
    };
  }
}

module.exports = AmazonAffiliateAPI;