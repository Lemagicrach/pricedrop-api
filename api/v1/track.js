export default function handler(req, res) {
  res.status(200).json({ endpoint: "track", status: "working" });
}
