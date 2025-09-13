export default function handler(req, res) {
  const host = req.headers.host;
  res.status(200).json({
    message: '🎉 PriceDrop API is Live!',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      health: `https://${host}/api/v1/health`,
      track: `https://${host}/api/v1/track`,
      products: `https://${host}/api/v1/products`,
    },
    documentation: 'https://github.com/yourusername/pricedrop-api'
  });
}