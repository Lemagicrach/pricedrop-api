export default function handler(req, res) {
  // Your cron job logic here
  console.log('Price check cron job running...');
  res.status(200).json({ message: 'Cron job executed' });
}