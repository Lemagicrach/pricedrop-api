// lib/ebay.js - eBay API Enhanced with Better Configuration
// Last updated: 2025-01-15

const axios = require('axios');

class eBayAPIEnhanced {
  constructor(appId = null, environment = null) {
    // Set environment
    this.environment = environment || process.env.EBAY_ENVIRONMENT || 'production';
    
    // Set App ID with fallback to environment variables
    this.appId = appId || 
                 (this.environment === 'production' 
                   ? process.env.EBAY_APP_ID 
                   : process.env.EBAY_SANDBOX_APP_ID) ||
                 process.env.EBAY_APP_ID; // Final fallback to main env var
    
    // Validate configuration on initialization
    this._validateConfiguration();
    
    // Set base URLs based on environment
    this.findingURL = this.environment === 'production'
      ? 'https://svcs.ebay.com'
      : 'https://svcs.sandbox.ebay.com';
    
    this.shoppingURL = this.environment === 'production'
      ? 'https://open.api.ebay.com/shopping'
      : 'https://open.api.sandbox.ebay.com/shopping';
    
    this.browseURL = this.environment === 'production'
      ? 'https://api.ebay.com/buy/browse/v1'
      : 'https://api.sandbox.ebay.com/buy/browse/v1';
  }

  /**
   * Validate eBay API configuration
   * @private
   */
  _validateConfiguration() {
    if (!this.appId) {
      console.error('❌ eBay API Configuration Error:');
      console.error('   EBAY_APP_ID is not set in environment variables');
      console.error('   Get your App ID from: https://developer.ebay.com/');
      console.error('   Add to .env file: EBAY_APP_ID=your_app_id_here');
    } else {
      console.log(`✅ eBay API configured successfully`);
      console.log(`   Environment: ${this.environment}`);
      console.log(`   App ID: ${this.appId.substring(0, 8)}...`);
    }
  }

  /**
   * Check if eBay API is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.appId && this.appId.length > 0);
  }

  /**
   * Get configuration details for debugging
   * @returns {Object}
   */
  getConfig() {
    return {
      configured: this.isConfigured(),
      environment: this.environment,
      appId: this.appId ? `${this.appId.substring(0, 8)}...` : 'NOT SET',
      findingURL: this.findingURL,
      shoppingURL: this.shoppingURL
    };
  }

  /**
   * Search products using Finding API
   * @param {string} keywords - Search keywords
   * @param {number} limit - Number of results (1-100)
   * @param {Object} options - Additional search options
   * @returns {Promise<Object>}
   */
  async searchProducts(keywords, limit = 10, options = {}) {
    // Validate configuration first
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'eBay API not configured. Please set EBAY_APP_ID environment variable.',
        code: 'EBAY_NOT_CONFIGURED',
        setup: 'https://developer.ebay.com/',
        environment: this.environment
      };
    }

    // Validate inputs
    if (!keywords || typeof keywords !== 'string' || keywords.trim().length === 0) {
      return {
        success: false,
        error: 'Keywords are required for search',
        code: 'INVALID_KEYWORDS'
      };
    }

    const searchLimit = Math.min(Math.max(limit, 1), 100); // Clamp between 1-100

    try {
      const url = `${this.findingURL}/services/search/FindingService/v1`;
      
      const params = {
        'OPERATION-NAME': 'findItemsByKeywords',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': true,
        'keywords': keywords.trim(),
        'paginationInput.entriesPerPage': searchLimit,
        'sortOrder': options.sortOrder || 'BestMatch'
      };

      // Add filters
      let filterIndex = 0;

      // Listing type filter (FixedPrice by default)
      params[`itemFilter(${filterIndex}).name`] = 'ListingType';
      params[`itemFilter(${filterIndex}).value`] = 'FixedPrice';
      filterIndex++;

      // Min price filter
      if (options.filters?.minPrice) {
        params[`itemFilter(${filterIndex}).name`] = 'MinPrice';
        params[`itemFilter(${filterIndex}).value`] = options.filters.minPrice;
        params[`itemFilter(${filterIndex}).paramName`] = 'Currency';
        params[`itemFilter(${filterIndex}).paramValue`] = 'USD';
        filterIndex++;
      }

      // Max price filter
      if (options.filters?.maxPrice) {
        params[`itemFilter(${filterIndex}).name`] = 'MaxPrice';
        params[`itemFilter(${filterIndex}).value`] = options.filters.maxPrice;
        params[`itemFilter(${filterIndex}).paramName`] = 'Currency';
        params[`itemFilter(${filterIndex}).paramValue`] = 'USD';
        filterIndex++;
      }

      // Country filter
      if (options.country) {
        params[`itemFilter(${filterIndex}).name`] = 'LocatedIn';
        params[`itemFilter(${filterIndex}).value`] = options.country;
        filterIndex++;
      }

      console.log(`🔍 Searching eBay for: "${keywords}" (limit: ${searchLimit})`);
      
      const response = await axios.get(url, { 
        params, 
        timeout: 15000,
        headers: {
          'User-Agent': 'PriceDropAPI/1.0'
        }
      });

      return this.formatSearchResults(response.data, keywords);
      
    } catch (error) {
      console.error('❌ eBay search error:', error.message);
      
      // Provide helpful error messages
      if (error.response) {
        return {
          success: false,
          error: `eBay API error: ${error.response.status}`,
          code: 'EBAY_API_ERROR',
          details: error.response.data,
          environment: this.environment
        };
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'eBay API request timeout. Please try again.',
          code: 'TIMEOUT',
          environment: this.environment
        };
      }

      return {
        success: false,
        error: error.message,
        code: 'EBAY_API_ERROR',
        environment: this.environment
      };
    }
  }

  /**
   * Get detailed product information using Shopping API
   * @param {string} itemId - eBay item ID
   * @returns {Promise<Object>}
   */
  async getProductDetails(itemId) {
    // Validate configuration
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'eBay API not configured',
        code: 'EBAY_NOT_CONFIGURED'
      };
    }

    // Validate item ID
    if (!itemId || typeof itemId !== 'string') {
      return {
        success: false,
        error: 'Valid item ID is required',
        code: 'INVALID_ITEM_ID'
      };
    }

    try {
      const url = this.shoppingURL;
      
      const params = {
        'callname': 'GetSingleItem',
        'version': '1193', // Latest stable version
        'appid': this.appId,
        'responseencoding': 'JSON',
        'ItemID': itemId.trim(),
        'IncludeSelector': 'Description,Details,ItemSpecifics,ShippingCosts,Variations'
      };

      console.log(`🔍 Fetching eBay item details: ${itemId}`);

      const response = await axios.get(url, { 
        params, 
        timeout: 15000,
        headers: {
          'User-Agent': 'PriceDropAPI/1.0'
        }
      });

      return this.formatProductDetails(response.data);
      
    } catch (error) {
      console.error('❌ eBay product details error:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: `eBay API error: ${error.response.status}`,
          code: 'EBAY_API_ERROR',
          itemId,
          details: error.response.data
        };
      }

      return {
        success: false,
        error: error.message,
        code: 'EBAY_API_ERROR',
        itemId
      };
    }
  }

  /**
   * Format search results consistently
   * @private
   */
  formatSearchResults(data, searchTerm = '') {
    try {
      const searchResult = data.findItemsByKeywordsResponse?.[0];
      
      if (!searchResult) {
        return {
          success: false,
          error: 'Invalid response from eBay API',
          code: 'INVALID_RESPONSE'
        };
      }

      // Check for API errors
      if (searchResult.ack[0] !== 'Success') {
        const errorMessage = searchResult.errorMessage?.[0]?.error?.[0]?.message?.[0] || 'Unknown error';
        return {
          success: false,
          error: `eBay API: ${errorMessage}`,
          code: 'EBAY_ERROR',
          raw: searchResult
        };
      }

      const items = searchResult.searchResult?.[0]?.item || [];
      
      if (items.length === 0) {
        return {
          success: true,
          message: `No results found for "${searchTerm}"`,
          count: 0,
          items: [],
          totalEntries: 0
        };
      }

      const formattedItems = items.map(item => this._formatSearchItem(item));

      return {
        success: true,
        environment: this.environment,
        query: searchTerm,
        count: formattedItems.length,
        totalEntries: parseInt(searchResult.paginationOutput?.[0]?.totalEntries?.[0] || 0),
        items: formattedItems
      };
    } catch (error) {
      console.error('Error formatting search results:', error);
      return {
        success: false,
        error: 'Failed to parse eBay response',
        code: 'PARSE_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Format single search item
   * @private
   */
  _formatSearchItem(item) {
    return {
      itemId: item.itemId?.[0],
      title: item.title?.[0],
      price: {
        value: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
        currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD'
      },
      shipping: {
        cost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0),
        currency: item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.['@currencyId'] || 'USD',
        type: item.shippingInfo?.[0]?.shippingType?.[0],
        freeShipping: item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ === '0.0'
      },
      url: item.viewItemURL?.[0],
      image: item.galleryURL?.[0] || item.pictureURLLarge?.[0],
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Not specified',
      location: {
        country: item.country?.[0],
        location: item.location?.[0]
      },
      seller: {
        username: item.sellerInfo?.[0]?.sellerUserName?.[0],
        feedback: parseInt(item.sellerInfo?.[0]?.feedbackScore?.[0] || 0),
        positive: parseFloat(item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0] || 0)
      },
      listing: {
        type: item.listingInfo?.[0]?.listingType?.[0],
        endTime: item.listingInfo?.[0]?.endTime?.[0],
        timeLeft: item.sellingStatus?.[0]?.timeLeft?.[0]
      },
      watchers: parseInt(item.listingInfo?.[0]?.watchCount?.[0] || 0)
    };
  }

  /**
   * Format single product details
   * @private
   */
  formatProductDetails(data) {
    try {
      const item = data.Item;
      
      if (!item) {
        return {
          success: false,
          error: 'Item not found',
          code: 'ITEM_NOT_FOUND'
        };
      }

      return {
        success: true,
        product: {
          itemId: item.ItemID,
          title: item.Title,
          subtitle: item.Subtitle || null,
          description: item.Description || null,
          price: {
            current: parseFloat(item.CurrentPrice?.Value || 0),
            currency: item.CurrentPrice?.CurrencyID || 'USD'
          },
          images: item.PictureURL || [],
          condition: item.ConditionDisplayName || 'Not specified',
          quantity: {
            available: parseInt(item.Quantity || 0),
            sold: parseInt(item.QuantitySold || 0)
          },
          seller: {
            userId: item.Seller?.UserID,
            feedback: parseInt(item.Seller?.FeedbackScore || 0),
            positive: parseFloat(item.Seller?.PositiveFeedbackPercent || 0)
          },
          specifications: item.ItemSpecifics?.NameValueList || [],
          shipping: item.ShippingCostSummary || null,
          location: {
            city: item.Location,
            country: item.Country,
            postalCode: item.PostalCode
          },
          listing: {
            startTime: item.ListingDetails?.StartTime,
            endTime: item.ListingDetails?.EndTime,
            timeLeft: item.TimeLeft
          },
          url: item.ViewItemURLForNaturalSearch || `https://www.ebay.com/itm/${item.ItemID}`,
          variations: item.Variations?.Variation || []
        }
      };
    } catch (error) {
      console.error('Error formatting product details:', error);
      return {
        success: false,
        error: 'Failed to parse eBay item details',
        code: 'PARSE_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Generate eBay affiliate link (eBay Partner Network)
   * @param {string} itemUrl - eBay item URL
   * @param {string} campaignId - Your eBay Partner Network campaign ID
   * @returns {string}
   */
  generateAffiliateLink(itemUrl, campaignId = process.env.EBAY_CAMPAIGN_ID || '5338736402') {
    try {
      const itemId = this.extractItemId(itemUrl);
      
      if (!itemId) {
        return itemUrl; // Return original if can't parse
      }

      const roverUrl = 'https://rover.ebay.com/rover/1/711-53200-19255-0/1';
      const params = new URLSearchParams({
        icep_id: '114',
        ipn: 'icep',
        toolid: '20004',
        campid: campaignId,
        customid: '',
        icep_item: itemId,
        icep_vectorid: '229466',
        kwid: '902099',
        mtid: '824',
        kw: 'lg'
      });
      
      return `${roverUrl}?${params.toString()}&mpre=${encodeURIComponent(itemUrl)}`;
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      return itemUrl;
    }
  }

  /**
   * Extract item ID from eBay URL
   * @param {string} url - eBay URL
   * @returns {string|null}
   */
  extractItemId(url) {
    const patterns = [
      /\/itm\/(\d+)/,           // /itm/123456789
      /\/(\d+)(?:\?|$)/,        // /123456789 or /123456789?
      /item=(\d+)/i             // item=123456789
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Get API call limits for your tier
   * @returns {Object}
   */
  getApiLimits() {
    return {
      environment: this.environment,
      configured: this.isConfigured(),
      dailyLimit: this.environment === 'production' ? '5,000 calls' : 'Unlimited (sandbox)',
      rateLimit: '30 calls per second',
      documentation: 'https://developer.ebay.com/api-docs/static/rate-limits.html',
      note: 'Limits are per App ID. Contact eBay for higher limits.'
    };
  }

  /**
   * Test API connectivity
   * @returns {Promise<Object>}
   */
  async testConnection() {
    try {
      const result = await this.searchProducts('test', 1);
      
      return {
        success: result.success,
        configured: this.isConfigured(),
        environment: this.environment,
        message: result.success 
          ? 'eBay API connection successful' 
          : `Connection failed: ${result.error}`,
        details: result
      };
    } catch (error) {
      return {
        success: false,
        configured: this.isConfigured(),
        environment: this.environment,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }
}

module.exports = eBayAPIEnhanced;