const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Set up proxy for API requests
const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:8000/api';
app.use('/api', createProxyMiddleware({
  target: apiUrl,
  changeOrigin: true,
  secure: false, // For development only - don't verify SSL certificate
  pathRewrite: {
    '^/api': ''
  }
}));

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// SSL certificate options
const sslOptions = {
  key: fs.readFileSync('./ssl/localhost.key'),
  cert: fs.readFileSync('./ssl/localhost.crt')
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});
