const { scrapePrice, isUrlSupported, getSupportedStores } = require('../lib/scraper');
const { authenticate } = require('../middleware/auth');
const { validateRequest, priceCheckSchema } = require('../lib/validators');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(HTTP_STATUS.OK).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  // Authenticate request
  const authResult = await authenticate(req, res);
  if (!authResult) return; // Response already sent by auth middleware
  
  try {
    // Validate request body
    const validation = validateRequest(priceCheckSchema, req.body);
    if (!validation.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error,
        code: 'VALIDATION_ERROR'
      });
    }
    
    const { url } = validation.data;
    
    if (!isUrlSupported(url)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'URL is not from a supported store',
        supported_stores: getSupportedStores(),
        code: ERROR_CODES.UNSUPPORTED_STORE
      });
    }
    
    // Scrape product information
    const productData = await scrapePrice(url);
    
    if (!productData) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Could not extract product information from URL',
        code: ERROR_CODES.SCRAPING_FAILED
      });
    }
    
    // Return price information without tracking
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Price check completed successfully',
      data: {
        product: {
          name: productData.name,
          current_price: productData.price,
          currency: productData.currency,
          store: productData.store,
          image: productData.image,
          in_stock: productData.inStock,
          url: productData.url,
          last_checked: productData.lastChecked,
          demo: productData.demo || false
        },
        request_info: {
          user_plan: req.user.plan,
          requests_remaining: req.user.limits.requests_per_day - req.user.requests_today,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Price check endpoint error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

