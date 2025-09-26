// lib/ebay-enhanced.js
const axios = require('axios');

class eBayAPIEnhanced {
  constructor(appId = null, environment = null) {
    // Use environment variables if not provided
    this.environment = environment || process.env.EBAY_ENVIRONMENT || 'sandbox';
    this.appId = appId || (this.environment === 'production' 
      ? process.env.EBAY_APP_ID 
      : process.env.EBAY_SANDBOX_APP_ID);
    
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

  // Search products using Finding API
  async searchProducts(keywords, limit = 10, options = {}) {
    try {
      const url = `${this.findingURL}/services/search/FindingService/v1`;
      
      const params = {
        'OPERATION-NAME': 'findItemsByKeywords',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': true,
        'keywords': keywords,
        'paginationInput.entriesPerPage': limit,
        'sortOrder': options.sortOrder || 'PricePlusShippingLowest',
        'itemFilter(0).name': 'ListingType',
        'itemFilter(0).value': 'FixedPrice',
        ...options.filters
      };

      // Add country filter if specified
      if (options.country) {
        params['itemFilter(1).name'] = 'LocatedIn';
        params['itemFilter(1).value'] = options.country;
      }

      const response = await axios.get(url, { params });
      return this.formatSearchResults(response.data);
      
    } catch (error) {
      console.error('eBay search error:', error.message);
      return {
        success: false,
        error: error.message,
        environment: this.environment
      };
    }
  }

  // Get detailed product information
  async getProductDetails(itemId) {
    try {
      const url = this.shoppingURL;
      
      const params = {
        'callname': 'GetSingleItem',
        'version': '1119',
        'appid': this.appId,
        'responseencoding': 'JSON',
        'ItemID': itemId,
        'IncludeSelector': 'Description,Details,ItemSpecifics,ShippingCosts,Variations'
      };

      const response = await axios.get(url, { params });
      return this.formatProductDetails(response.data);
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        itemId: itemId
      };
    }
  }

  // Get multiple items for price comparison
  async getMultipleItems(itemIds) {
    try {
      const url = this.shoppingURL;
      
      const params = {
        'callname': 'GetMultipleItems',
        'version': '1119',
        'appid': this.appId,
        'responseencoding': 'JSON',
        'ItemID': itemIds.join(','),
        'IncludeSelector': 'Details,ItemSpecifics'
      };

      const response = await axios.get(url, { params });
      return this.formatMultipleItems(response.data);
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Search using Browse API (OAuth required for production)
  async browseSearch(query, limit = 20) {
    try {
      // For production, you'll need OAuth token
      const headers = {
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<YOUR_CAMPAIGN_ID>'
      };

      const params = {
        q: query,
        limit: limit
      };

      const response = await axios.get(`${this.browseURL}/item_summary/search`, {
        headers,
        params
      });

      return this.formatBrowseResults(response.data);
      
    } catch (error) {
      return {
        success: false,
        error: 'Browse API requires OAuth authentication for production',
        message: error.message
      };
    }
  }

  // Format search results consistently
  formatSearchResults(data) {
    const searchResult = data.findItemsByKeywordsResponse?.[0];
    
    if (!searchResult || searchResult.ack[0] !== 'Success') {
      return {
        success: false,
        error: 'No results found',
        raw: searchResult
      };
    }

    const items = searchResult.searchResult?.[0]?.item || [];
    
    return {
      success: true,
      environment: this.environment,
      count: parseInt(searchResult.searchResult?.[0]?.['@count'] || 0),
      totalEntries: parseInt(searchResult.paginationOutput?.[0]?.totalEntries?.[0] || 0),
      items: items.map(item => ({
        itemId: item.itemId?.[0],
        title: item.title?.[0],
        price: {
          value: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
          currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD'
        },
        shipping: {
          cost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0),
          type: item.shippingInfo?.[0]?.shippingType?.[0]
        },
        url: item.viewItemURL?.[0],
        image: item.galleryURL?.[0] || item.pictureURLLarge?.[0],
        condition: item.condition?.[0]?.conditionDisplayName?.[0],
        location: {
          country: item.country?.[0],
          location: item.location?.[0]
        },
        seller: {
          username: item.sellerInfo?.[0]?.sellerUserName?.[0],
          feedback: item.sellerInfo?.[0]?.feedbackScore?.[0],
          positive: item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0]
        },
        listing: {
          type: item.listingInfo?.[0]?.listingType?.[0],
          endTime: item.listingInfo?.[0]?.endTime?.[0],
          timeLeft: item.sellingStatus?.[0]?.timeLeft?.[0]
        },
        watchers: item.listingInfo?.[0]?.watchCount?.[0]
      }))
    };
  }

  // Format single product details
  formatProductDetails(data) {
    const item = data.Item;
    
    if (!item) {
      return {
        success: false,
        error: 'Item not found'
      };
    }

    return {
      success: true,
      product: {
        itemId: item.ItemID,
        title: item.Title,
        subtitle: item.Subtitle,
        description: item.Description,
        price: {
          current: item.CurrentPrice?.Value,
          currency: item.CurrentPrice?.CurrencyID
        },
        images: item.PictureURL || [],
        condition: item.ConditionDisplayName,
        quantity: {
          available: item.Quantity,
          sold: item.QuantitySold
        },
        seller: {
          userId: item.Seller?.UserID,
          feedback: item.Seller?.FeedbackScore,
          positive: item.Seller?.PositiveFeedbackPercent
        },
        specifications: item.ItemSpecifics?.NameValueList || [],
        shipping: item.ShippingCostSummary,
        location: {
          city: item.Location,
          country: item.Country,
          postalCode: item.PostalCode
        },
        variations: item.Variations?.Variation || []
      }
    };
  }

  // Format multiple items
  formatMultipleItems(data) {
    const items = data.Item || [];
    
    return {
      success: true,
      count: items.length,
      items: items.map(item => ({
        itemId: item.ItemID,
        title: item.Title,
        price: item.CurrentPrice?.Value,
        currency: item.CurrentPrice?.CurrencyID,
        url: item.ViewItemURLForNaturalSearch,
        image: item.PictureURL?.[0],
        condition: item.ConditionDisplayName,
        quantity: item.Quantity - (item.QuantitySold || 0)
      }))
    };
  }

  // Format browse API results
  formatBrowseResults(data) {
    return {
      success: true,
      total: data.total,
      items: data.itemSummaries?.map(item => ({
        itemId: item.itemId,
        title: item.title,
        price: item.price?.value,
        currency: item.price?.currency,
        image: item.image?.imageUrl,
        condition: item.condition,
        url: item.itemWebUrl
      })) || []
    };
  }

  // Generate eBay affiliate link
  generateAffiliateLink(itemUrl, campaignId = '5338736402') {
    const roverUrl = 'https://rover.ebay.com/rover/1/711-53200-19255-0/1';
    const params = new URLSearchParams({
      icep_id: 114,
      ipn: 'icep',
      toolid: '20004',
      campid: campaignId,
      customid: '',
      icep_item: this.extractItemId(itemUrl),
      ipn: 'psmain',
      icep_vectorid: '229466',
      kwid: '902099',
      mtid: '824',
      kw: 'lg'
    });
    
    return `${roverUrl}?${params.toString()}&mpre=${encodeURIComponent(itemUrl)}`;
  }

  // Extract item ID from URL
  extractItemId(url) {
    const match = url.match(/\/itm\/(\d+)|\/(\d+)\?/);
    return match ? (match[1] || match[2]) : null;
  }

  // Check API call limits
  async checkApiLimits() {
    // eBay Finding API limits:
    // - 5,000 calls per day for approved apps
    // - Additional calls available for partners
    return {
      environment: this.environment,
      dailyLimit: this.environment === 'production' ? 5000 : 'unlimited',
      rateLimit: '30 calls per second',
      documentation: 'https://developer.ebay.com/api-docs/static/rate-limits.html'
    };
  }
}

module.exports = eBayAPIEnhanced;