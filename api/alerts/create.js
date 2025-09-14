export default function handler(req, res) {
  res.status(200).json({ 
    endpoint: "alerts/create",
    message: "Alert creation endpoint (demo mode)"
  });
}
