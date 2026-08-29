const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Health Check API is running',
    healthEndpoint: '/health'
  });
});

app.listen(PORT, () => {
  console.log(`Health check API running on http://localhost:${PORT}`);
});
