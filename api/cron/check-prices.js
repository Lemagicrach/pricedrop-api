export default function handler(req, res) {
  res.status(200).json({ 
    endpoint: "cron/check-prices",
    message: "Price check cron job (demo mode)"
  });
}
