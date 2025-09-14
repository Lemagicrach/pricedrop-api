export default function handler(req, res) {
  res.status(200).json({ endpoint: "track", status: "working" });
}
if (req.headers['x-some-secret'] !== process.env.SOME_SECRET) {
  return res.status(404).json({ error: 'Not Found' });
}