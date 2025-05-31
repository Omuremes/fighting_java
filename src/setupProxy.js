const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('[PROXY SETUP] Setting up proxies...');
  
  // WebSocket proxy configuration
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      ws: true, // Enable WebSockets proxying
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[WS PROXY] ${req.method} ${req.url} -> http://localhost:8082${req.url}`);
      },
      onError: (err, req, res) => {
        console.error(`[WS PROXY ERROR] for ${req.method} ${req.path}:`, err);
        if (res.writeHead && !res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
          });
          res.end(`WebSocket Proxy Error: ${err.message}`);
        }
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  );
  
  console.log('[PROXY SETUP] /ws WebSocket proxy configured');
  
  // Прокси для /api путей
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8082/api',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      pathRewrite: {
        '^/api': '', // Remove /api prefix since target already includes it
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[API PROXY] ${req.method} ${req.url} -> http://localhost:8082${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`[API PROXY] Response: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[API PROXY ERROR] for ${req.method} ${req.path}:`, err);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end(`API Proxy Error: ${err.message}`);
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  );
  
  console.log('[PROXY SETUP] /api proxy configured');
  
  // Добавляем прокси для /games путей
  app.use(
    '/games',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      secure: false,
      onProxyReq: (proxyReq, req) => {
        if (['POST', 'PUT'].includes(req.method) && req.body) {
          const bodyData = JSON.stringify(req.body);
          // Update header
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          // Write body
          proxyReq.write(bodyData);
        }
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      }
    })
  );
  
  // Добавляем прокси для /users путей
  app.use(
    '/users',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      secure: false,
      onProxyReq: (proxyReq, req) => {
        if (['POST', 'PUT'].includes(req.method) && req.body) {
          const bodyData = JSON.stringify(req.body);
          // Update header
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          // Write body
          proxyReq.write(bodyData);
        }
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      }
    })
  );
};
