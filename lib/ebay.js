const axios = require('axios');

class eBayAPI {
  constructor(appId, environment = 'sandbox') {
    this.appId = appId;
    this.baseURL = environment === 'production'
      ? 'https://svcs.ebay.com'
      : 'https://svcs.sandbox.ebay.com';
  }

  async searchProducts(keywords, limit = 10) {
    try {
      const url = `${this.baseURL}/services/search/FindingService/v1`;
      
      const params = {
        'OPERATION-NAME': 'findItemsByKeywords',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': true,
        'keywords': keywords,
        'paginationInput.entriesPerPage': limit,
        'sortOrder': 'PricePlusShippingLowest'
      };

      const response = await axios.get(url, { params });
      
      // eBay returns nested data
      const searchResult = response.data.findItemsByKeywordsResponse?.[0];
      
      if (searchResult.ack[0] === 'Success') {
        const items = searchResult.searchResult?.[0]?.item || [];
        
        return {
          success: true,
          count: parseInt(searchResult.searchResult?.[0]?.['@count'] || 0),
          items: items.map(item => ({
            itemId: item.itemId?.[0],
            title: item.title?.[0],
            price: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__,
            currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'],
            url: item.viewItemURL?.[0],
            image: item.galleryURL?.[0],
            condition: item.condition?.[0]?.conditionDisplayName?.[0],
            location: item.location?.[0]
          }))
        };
      } else {
        return {
          success: false,
          error: 'eBay API error',
          details: searchResult.errorMessage
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getProductDetails(itemId) {
    // Use GetSingleItem call for detailed info
    try {
      const url = `${this.baseURL}/shopping`;
      
      const params = {
        'callname': 'GetSingleItem',
        'version': '1119',
        'appid': this.appId,
        'responseencoding': 'JSON',
        'ItemID': itemId,
        'IncludeSelector': 'Description,Details,ItemSpecifics'
      };

      const response = await axios.get(url, { params });
      return response.data;
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = eBayAPI;