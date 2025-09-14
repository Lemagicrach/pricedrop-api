export default function handler(req, res) {
  res.status(200).json({ 
    endpoint: "products",
    products: [],
    count: 0
  });
}
