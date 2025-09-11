const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'working' });
});

app.listen(3000, () => {
  console.log('Test server running on port 3000');
});