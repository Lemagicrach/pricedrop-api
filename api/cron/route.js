export default function handler(req, res) {
  res.status(200).json({ 
    endpoint: "cron/route",
    message: "Cron route handler"
  });
}
