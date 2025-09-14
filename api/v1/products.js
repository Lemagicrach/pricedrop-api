export default function handler(req, res) {
  res.status(200).json({
    success: true,
    products: [],
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
      has_more: false
    }
  });
}