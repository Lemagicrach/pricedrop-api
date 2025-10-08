module.exports = {
  info: {
    name: 'PriceDrop API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Comprehensive Postman collection for the PriceDrop API v1.0 endpoints.'
  },
  variable: [
    { key: 'baseUrl', value: 'https://pricedrop-api.vercel.app', type: 'string' },
    { key: 'rapidapiHost', value: 'pricedrop-api.p.rapidapi.com', type: 'string' },
    { key: 'rapidapiKey', value: 'YOUR_RAPIDAPI_KEY', type: 'string' },
    { key: 'cronSecret', value: 'YOUR_CRON_SECRET', type: 'string' },
    { key: 'searchKeywords', value: 'gaming laptop', type: 'string' },
    { key: 'productId', value: '1234567890', type: 'string' },
    { key: 'alertId', value: 'sample-alert-id', type: 'string' }
  ],
  item: [
    {
      name: 'Discovery',
      item: [
        {
          name: 'API Overview',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{baseUrl}}/api',
              host: ['{{baseUrl}}'],
              path: ['api']
            }
          }
        },
        {
          name: 'Supported Stores',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{baseUrl}}/api/stores',
              host: ['{{baseUrl}}'],
              path: ['api', 'stores']
            }
          }
        }
      ]
    },
    {
      name: 'Core',
      item: [
        {
          name: 'Core Health',
          request: {
            method: 'GET',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/core/health',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'core', 'health']
            }
          }
        },
        {
          name: 'Service Status',
          request: {
            method: 'GET',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/core/status',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'core', 'status']
            }
          }
        }
      ]
    },
    {
      name: 'Products',
      item: [
        {
          name: 'Search Products',
          request: {
            method: 'GET',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/products/search?keywords={{searchKeywords}}&limit=5',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'products', 'search'],
              query: [
                { key: 'keywords', value: '{{searchKeywords}}' },
                { key: 'limit', value: '5' }
              ]
            }
          }
        },
        {
          name: 'Get Product Details',
          request: {
            method: 'GET',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/products/{{productId}}',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'products', '{{productId}}']
            }
          }
        },
        {
          name: 'Track Product',
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json', type: 'text' },
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                url: 'https://www.ebay.com/itm/1234567890',
                target_price: 299.99,
                notify_on_drop: true,
                email: 'shopper@example.com',
                webhook_url: 'https://example.com/price-drop',
                check_frequency: '1h'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/api/v1/products/track',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'products', 'track']
            }
          }
        },
        {
          name: 'Compare Products',
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json', type: 'text' },
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                product: 'PlayStation 5 console',
                limit: 5
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/api/v1/products/compare',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'products', 'compare']
            }
          }
        }
      ]
    },
    {
      name: 'Prices',
      item: [
        {
          name: 'Price History',
          request: {
            method: 'GET',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/prices/history?product_id={{productId}}&days=30',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'prices', 'history'],
              query: [
                { key: 'product_id', value: '{{productId}}' },
                { key: 'days', value: '30' }
              ]
            }
          }
        },
        {
          name: 'Run Price Check (Cron)',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{cronSecret}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/prices/check',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'prices', 'check']
            }
          }
        }
      ]
    },
    {
      name: 'Alerts',
      item: [
        {
          name: 'List Alerts',
          request: {
            method: 'GET',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/prices/alerts',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'prices', 'alerts']
            }
          }
        },
        {
          name: 'Create Alert',
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json', type: 'text' },
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                product_url: 'https://www.ebay.com/itm/1234567890',
                target_price: 249.99,
                notification_channels: ['email', 'webhook'],
                email: 'shopper@example.com',
                webhook_url: 'https://example.com/price-drop'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/api/v1/prices/alerts',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'prices', 'alerts']
            }
          }
        },
        {
          name: 'Update Alert',
          request: {
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json', type: 'text' },
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                target_price: 229.99,
                status: 'active'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/api/v1/prices/alerts?alert_id={{alertId}}',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'prices', 'alerts'],
              query: [
                { key: 'alert_id', value: '{{alertId}}' }
              ]
            }
          }
        },
        {
          name: 'Delete Alert',
          request: {
            method: 'DELETE',
            header: [
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            url: {
              raw: '{{baseUrl}}/api/v1/prices/alerts?alert_id={{alertId}}',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'prices', 'alerts'],
              query: [
                { key: 'alert_id', value: '{{alertId}}' }
              ]
            }
          }
        }
      ]
    },
    {
      name: 'Affiliate',
      item: [
        {
          name: 'Generate Affiliate Links',
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json', type: 'text' },
              { key: 'X-RapidAPI-Key', value: '{{rapidapiKey}}', type: 'text' },
              { key: 'X-RapidAPI-Host', value: '{{rapidapiHost}}', type: 'text' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                urls: ['https://www.amazon.com/dp/B0C7SG3B8G'],
                platform: 'amazon'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/api/v1/affiliate/generate',
              host: ['{{baseUrl}}'],
              path: ['api', 'v1', 'affiliate', 'generate']
            }
          }
        }
      ]
    }
  ]
};