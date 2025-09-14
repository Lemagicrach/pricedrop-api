export default function handler(req, res) {
  res.status(200).json({ 
    endpoint: "alerts/drops",
    drops: [],
    message: "No price drops currently"
  });
}
